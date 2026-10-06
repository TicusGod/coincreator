// Meteora DAMM v2 (cp-amm): create a TOKEN/SOL pool from the creator's wallet, list and remove their positions.
import { ComputeBudgetProgram, Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { NATIVE_MINT, unpackMint } from "@solana/spl-token";
import BN from "bn.js";
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  CpAmm,
  MAX_SQRT_PRICE,
  MIN_SQRT_PRICE,
  deriveCustomizablePoolAddress,
  getBaseFeeParams,
  getCurrentPoint,
  getTokenProgram,
  getUnClaimLpFee,
  type PoolState,
  type PositionState,
} from "@meteora-ag/cp-amm-sdk";
import { FEES, PRIORITY_MICRO_LAMPORTS, TREASURY } from "@/lib/config";
import { metadataPda } from "./metaplex";

/** Swap fee tiers offered in the UI (bps). */
export const FEE_TIERS = [25, 100, 200, 400] as const;

export const toRaw = (ui: string, decimals: number): BN => {
  const [int, frac = ""] = ui.trim().split(".");
  if (!/^\d+$/.test(int || "0") || !/^\d*$/.test(frac)) throw new Error("Invalid amount");
  return new BN((int || "0") + frac.padEnd(decimals, "0").slice(0, decimals));
};

export const fromRaw = (raw: BN, decimals: number, digits = 4): string => {
  const s = raw.toString().padStart(decimals + 1, "0");
  const int = s.slice(0, s.length - decimals);
  const frac = s.slice(s.length - decimals).slice(0, digits).replace(/0+$/, "");
  return frac ? `${int}.${frac}` : int;
};

export interface CreatePoolParams {
  owner: PublicKey;
  tokenMint: PublicKey;
  tokenAmount: string; // UI units
  solAmount: string; // UI units
  feeBps: number;
  lockLiquidity: boolean;
}

export async function buildCreatePoolTx(conn: Connection, p: CreatePoolParams, treasury = TREASURY) {
  const info = await conn.getAccountInfo(p.tokenMint);
  if (!info) throw new Error("Token not found on Solana mainnet");
  const mint = unpackMint(p.tokenMint, info, info.owner);
  if (mint.freezeAuthority) throw new Error("Revoke the freeze authority before creating a pool");

  const cpAmm = new CpAmm(conn);
  const tokenAAmount = toRaw(p.tokenAmount, mint.decimals);
  const tokenBAmount = toRaw(p.solAmount, 9);
  if (tokenAAmount.isZero() || tokenBAmount.isZero()) throw new Error("Both amounts must be greater than 0");

  const pool = deriveCustomizablePoolAddress(p.tokenMint, NATIVE_MINT);
  if (await conn.getAccountInfo(pool)) throw new Error("A Meteora pool already exists for this token");

  const { initSqrtPrice, liquidityDelta } = cpAmm.preparePoolCreationParams({
    tokenAAmount,
    tokenBAmount,
    minSqrtPrice: MIN_SQRT_PRICE,
    maxSqrtPrice: MAX_SQRT_PRICE,
    collectFeeMode: CollectFeeMode.OnlyB,
  });

  const positionNft = Keypair.generate();
  const { tx: poolTx, position } = await cpAmm.createCustomPool({
    payer: p.owner,
    creator: p.owner,
    positionNft: positionNft.publicKey,
    tokenAMint: p.tokenMint,
    tokenBMint: NATIVE_MINT,
    tokenAAmount,
    tokenBAmount,
    sqrtMinPrice: MIN_SQRT_PRICE,
    sqrtMaxPrice: MAX_SQRT_PRICE,
    liquidityDelta,
    initSqrtPrice,
    poolFees: {
      baseFee: getBaseFeeParams({
        baseFeeMode: BaseFeeMode.FeeTimeSchedulerLinear,
        feeTimeSchedulerParam: { startingFeeBps: p.feeBps, endingFeeBps: p.feeBps, numberOfPeriod: 0, totalDuration: 0 },
      }),
      compoundingFeeBps: 0,
      padding: 0,
      dynamicFee: null,
    },
    hasAlphaVault: false,
    activationType: ActivationType.Timestamp,
    collectFeeMode: CollectFeeMode.OnlyB,
    activationPoint: null,
    tokenAProgram: info.owner,
    tokenBProgram: getTokenProgram(0),
    isLockLiquidity: p.lockLiquidity,
  });

  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_MICRO_LAMPORTS }),
    ...poolTx.instructions,
  );
  if (treasury && FEES.createLiquidity > 0) tx.add(SystemProgram.transfer({ fromPubkey: p.owner, toPubkey: treasury, lamports: FEES.createLiquidity }));
  tx.feePayer = p.owner;
  return { tx, positionNft, pool, position };
}

export interface UserPosition {
  position: PublicKey;
  positionNftAccount: PublicKey;
  positionState: PositionState;
  pool: PublicKey;
  poolState: PoolState;
  tokenMint: PublicKey; // the non-SOL side
  symbol: string;
  name: string;
  uri: string;
  locked: boolean;
  outToken: string;
  outSol: string;
  minOutA: BN; // 95 % of the quote, slippage guard on withdraw
  minOutB: BN;
  feeSol: string; // unclaimed swap fees (UI units)
  feeToken: string;
  hasFees: boolean;
}

/** Reads name/symbol/uri from Metaplex metadata; falls back to a short mint. */
export async function tokenLabels(conn: Connection, mints: PublicKey[]): Promise<{ name: string; symbol: string; uri: string }[]> {
  const infos = await conn.getMultipleAccountsInfo(mints.map(metadataPda));
  const readStr = (d: Buffer, o: number) => {
    const len = d.readUInt32LE(o);
    return { s: d.subarray(o + 4, o + 4 + len).toString("utf8").replace(/\0/g, "").trim(), next: o + 4 + len };
  };
  return infos.map((a, i) => {
    const short = `${mints[i].toBase58().slice(0, 4)}…${mints[i].toBase58().slice(-4)}`;
    if (!a) return { name: short, symbol: short, uri: "" };
    try {
      const name = readStr(a.data, 65);
      const symbol = readStr(a.data, name.next);
      const uri = readStr(a.data, symbol.next);
      return { name: name.s || short, symbol: symbol.s || short, uri: uri.s };
    } catch {
      return { name: short, symbol: short, uri: "" };
    }
  });
}

export async function listPositions(conn: Connection, owner: PublicKey): Promise<UserPosition[]> {
  const cpAmm = new CpAmm(conn);
  const positions = await cpAmm.getPositionsByUser(owner);
  if (!positions.length) return [];
  const poolKeys = positions.map((p) => p.positionState.pool);
  const pools = await Promise.all(poolKeys.map((k) => cpAmm.fetchPoolState(k)));
  const tokenMints = pools.map((s) => (s.tokenAMint.equals(NATIVE_MINT) ? s.tokenBMint : s.tokenAMint));
  const [labels, mintInfos] = await Promise.all([tokenLabels(conn, tokenMints), conn.getMultipleAccountsInfo(tokenMints)]);

  return positions.map((p, i) => {
    const poolState = pools[i];
    const mintInfo = mintInfos[i];
    const decimals = mintInfo ? unpackMint(tokenMints[i], mintInfo, mintInfo.owner).decimals : 6;
    // The SDK refuses a zero liquidityDelta (fully locked positions), so quote only what exists.
    const quoteOf = (liquidityDelta: BN) =>
      liquidityDelta.isZero()
        ? { outAmountA: new BN(0), outAmountB: new BN(0) }
        : cpAmm.getWithdrawQuote({
            liquidityDelta,
            sqrtPrice: poolState.sqrtPrice,
            minSqrtPrice: poolState.sqrtMinPrice,
            maxSqrtPrice: poolState.sqrtMaxPrice,
            collectFeeMode: poolState.collectFeeMode,
            tokenAAmount: poolState.tokenAAmount,
            tokenBAmount: poolState.tokenBAmount,
            liquidity: poolState.liquidity,
          });
    const ps = p.positionState;
    const quote = quoteOf(ps.unlockedLiquidity.add(ps.permanentLockedLiquidity).add(ps.vestedLiquidity)); // position value
    const withdrawable = quoteOf(ps.unlockedLiquidity);
    const solIsA = poolState.tokenAMint.equals(NATIVE_MINT);
    const fees = getUnClaimLpFee(poolState, p.positionState);
    const feeSolRaw = solIsA ? fees.feeTokenA : fees.feeTokenB;
    const feeTokenRaw = solIsA ? fees.feeTokenB : fees.feeTokenA;
    return {
      ...p,
      pool: poolKeys[i],
      poolState,
      tokenMint: tokenMints[i],
      ...labels[i],
      locked: p.positionState.unlockedLiquidity.isZero(),
      outToken: fromRaw(solIsA ? quote.outAmountB : quote.outAmountA, decimals),
      outSol: fromRaw(solIsA ? quote.outAmountA : quote.outAmountB, 9),
      minOutA: withdrawable.outAmountA.muln(95).divn(100),
      minOutB: withdrawable.outAmountB.muln(95).divn(100),
      feeSol: fromRaw(feeSolRaw, 9, 6),
      feeToken: fromRaw(feeTokenRaw, decimals),
      hasFees: !feeSolRaw.isZero() || !feeTokenRaw.isZero(),
    };
  });
}

/** Withdraws everything, claims fees and closes the position (refunds its rent). */
export async function buildRemoveTx(conn: Connection, owner: PublicKey, p: UserPosition, treasury = TREASURY) {
  const cpAmm = new CpAmm(conn);
  if (!p.positionState.vestedLiquidity.isZero() || !p.positionState.permanentLockedLiquidity.isZero())
    throw new Error("This position is locked and cannot be withdrawn");
  const [vestings, currentPoint] = await Promise.all([
    cpAmm.getAllVestingsByPosition(p.position),
    getCurrentPoint(conn, p.poolState.activationType),
  ]);
  const built = await cpAmm.removeAllLiquidityAndClosePosition({
    owner,
    position: p.position,
    positionNftAccount: p.positionNftAccount,
    poolState: p.poolState,
    positionState: p.positionState,
    tokenAAmountThreshold: p.minOutA,
    tokenBAmountThreshold: p.minOutB,
    vestings: vestings.map((v) => ({ account: v.publicKey, vestingState: v.account })),
    currentPoint,
  });
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_MICRO_LAMPORTS }),
    ...built.instructions,
  );
  if (treasury && FEES.removeLiquidity > 0) tx.add(SystemProgram.transfer({ fromPubkey: owner, toPubkey: treasury, lamports: FEES.removeLiquidity }));
  tx.feePayer = owner;
  return tx;
}

/** Claims the position's swap fees to the owner's wallet (SOL arrives unwrapped). No service fee. */
export async function buildClaimFeesTx(conn: Connection, owner: PublicKey, p: UserPosition) {
  const s = p.poolState;
  const built = await new CpAmm(conn).claimPositionFee({
    owner,
    position: p.position,
    pool: p.pool,
    positionNftAccount: p.positionNftAccount,
    tokenAMint: s.tokenAMint,
    tokenBMint: s.tokenBMint,
    tokenAVault: s.tokenAVault,
    tokenBVault: s.tokenBVault,
    tokenAProgram: getTokenProgram(s.tokenAFlag),
    tokenBProgram: getTokenProgram(s.tokenBFlag),
  });
  const tx = new Transaction().add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_MICRO_LAMPORTS }), ...built.instructions);
  tx.feePayer = owner;
  return tx;
}
