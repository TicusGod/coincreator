/**
 * Create Coin → Create Liquidity → Remove Liquidity against the REAL mainnet Metaplex + Meteora DAMM v2 programs
 * cloned into LiteSVM. Fresh keypairs; the network is only read to clone programs.  npm run test:svm
 */
import { beforeAll, describe, expect, it } from "vitest";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, type Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, unpackMint } from "@solana/spl-token";
import { LiteSVM, Rent } from "litesvm";
import { buildCreateCoinTx, buildMintMoreTx, buildRevokeMintTx, coinFee } from "@/lib/chain/token";
import { buildClaimFeesTx, buildCreatePoolTx, buildRemoveTx, listPositions } from "@/lib/chain/meteora";
import { findMyCoins } from "@/lib/chain/coins";
import { CpAmm, getTokenProgram } from "@meteora-ag/cp-amm-sdk";
import { NATIVE_MINT } from "@solana/spl-token";
import BN from "bn.js";
import { METADATA_PROGRAM_ID, metadataPda } from "@/lib/chain/metaplex";
import { FEES } from "@/lib/config";
import { svmConnection, type SvmConn } from "./support/svm-conn";
import { sendAndConfirm } from "@/lib/client/send";
import type { AppWallet } from "@/lib/client/wallet";

const mainnet = new Connection(process.env.RPC_URL || "https://api.mainnet-beta.solana.com", "confirmed");
const svm = new LiteSVM().withDefaultPrograms();
svm.setRent(new Rent(2540n, 2.0, 50));
const conn: SvmConn = svmConnection(svm, mainnet);
const owner = Keypair.generate();
const treasury = Keypair.generate();
const bal = (k: PublicKey) => Number(svm.getBalance(k) ?? 0n);
const tokens = (mint: PublicKey) => Buffer.from(svm.getAccount(getAssociatedTokenAddressSync(mint, owner.publicKey))!.data).readBigUInt64LE(64);

async function send(tx: Transaction, extra: Keypair[] = []) {
  tx.recentBlockhash = svm.latestBlockhash();
  tx.sign(owner, ...extra);
  return conn.sendRawTransaction(tx.serialize());
}

let mint: PublicKey;

beforeAll(async () => {
  const c = svm.getClock();
  c.unixTimestamp = BigInt(Math.floor(Date.now() / 1000));
  svm.setClock(c);
  svm.airdrop(owner.publicKey, BigInt(50 * LAMPORTS_PER_SOL));
  await conn.clone([METADATA_PROGRAM_ID, new PublicKey("cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG")]);
});

describe("full flow", () => {
  it("creates a coin with metadata, revoked authorities and pays the fee", async () => {
    const opts = { revokeFreeze: true, revokeMint: true, revokeUpdate: false };
    const { tx, mint: kp } = await buildCreateCoinTx(conn, {
      owner: owner.publicKey, name: "Copy Cat", symbol: "cAt", uri: "https://ipfs.io/ipfs/bafy", decimals: 6, supply: 1_000_000_000n, ...opts,
    }, treasury.publicKey);
    await send(tx, [kp]);
    mint = kp.publicKey;
    const m = unpackMint(mint, (await conn.getAccountInfo(mint))!);
    expect(m.supply).toBe(1_000_000_000n * 1_000_000n);
    expect(m.mintAuthority).toBeNull();
    expect(m.freezeAuthority).toBeNull();
    expect(tokens(mint)).toBe(m.supply);
    const meta = svm.getAccount(metadataPda(mint))!;
    expect(Buffer.from(meta.data).toString("utf8")).toContain("Copy Cat");
    expect(Buffer.from(meta.data).toString("utf8")).toContain("cAt"); // ticker case kept
    expect(bal(treasury.publicKey)).toBe(coinFee(opts));
  });

  it("creates a Meteora DAMM v2 TOKEN/SOL pool", async () => {
    const before = bal(treasury.publicKey);
    const { tx, positionNft, pool } = await buildCreatePoolTx(conn, {
      owner: owner.publicKey, tokenMint: mint, tokenAmount: "800000000", solAmount: "2", feeBps: 100, lockLiquidity: false,
    }, treasury.publicKey);
    await send(tx, [positionNft]);
    expect(svm.getAccount(pool)).toBeTruthy();
    expect(tokens(mint)).toBe(200_000_000n * 1_000_000n);
    expect(bal(treasury.publicKey) - before).toBe(FEES.createLiquidity);
  });

  it("lists the position and removes all liquidity", async () => {
    const positions = await listPositions(conn, owner.publicKey);
    expect(positions).toHaveLength(1);
    const p = positions[0];
    expect(p.symbol).toBe("cAt");
    expect(p.locked).toBe(false);
    expect(Number(p.outSol)).toBeGreaterThan(1.99);
    // 50 % first: position stays open with half the liquidity
    await send(await buildRemoveTx(conn, owner.publicKey, p, 50, treasury.publicKey));
    const half = (await listPositions(conn, owner.publicKey))[0];
    expect(Number(half.outSol)).toBeGreaterThan(0.99);
    expect(Number(half.outSol)).toBeLessThan(1.01);
    const solBefore = bal(owner.publicKey);
    await send(await buildRemoveTx(conn, owner.publicKey, half, 100, treasury.publicKey));
    expect(tokens(mint)).toBeGreaterThan(999_000_000n * 1_000_000n);
    expect(bal(owner.publicKey) - solBefore).toBeGreaterThan(0.9 * LAMPORTS_PER_SOL);
    expect(await listPositions(conn, owner.publicKey)).toHaveLength(0);
  });

  it("mints more later, then revokes the mint authority (manage tools)", async () => {
    const { tx, mint: kp } = await buildCreateCoinTx(conn, {
      owner: owner.publicKey, name: "Later", symbol: "LTR", uri: "https://x.y", decimals: 6, supply: 1000n, revokeFreeze: true, revokeMint: false, revokeUpdate: false,
    }, null);
    await send(tx, [kp]);
    const before = bal(treasury.publicKey);
    await send(buildMintMoreTx(owner.publicKey, kp.publicKey, 6, "500.5", treasury.publicKey));
    expect(tokens(kp.publicKey)).toBe(1_500_500_000n);
    await send(buildRevokeMintTx(owner.publicKey, kp.publicKey, treasury.publicKey));
    expect(unpackMint(kp.publicKey, (await conn.getAccountInfo(kp.publicKey))!).mintAuthority).toBeNull();
    expect(bal(treasury.publicKey) - before).toBe(FEES.mintMore + FEES.revokeMint);
    expect(() => buildMintMoreTx(owner.publicKey, kp.publicKey, 6, "1.1234567")).toThrow(/Invalid/);
  });

  it("app send path: extra keypair signs first, then the wallet (Privy order), via a serialized round-trip", async () => {
    const wallet: AppWallet = {
      ready: true, publicKey: owner.publicKey, label: "test", connect: () => {}, disconnect: async () => {},
      // what Privy does: receives bytes, signs its slot, returns bytes
      sign: async (tx) => {
        const t = (await import("@solana/web3.js")).Transaction.from(tx.serialize({ requireAllSignatures: false, verifySignatures: false }));
        t.partialSign(owner);
        return t;
      },
    };
    const { tx, mint: kp } = await buildCreateCoinTx(conn, {
      owner: owner.publicKey, name: "Bridge", symbol: "BRG", uri: "https://x.y", decimals: 6, supply: 42n, revokeFreeze: true, revokeMint: true, revokeUpdate: false,
    }, null);
    const sig = await sendAndConfirm(wallet, conn, tx, [kp]);
    expect(sig.length).toBeGreaterThan(40);
    expect(tokens(kp.publicKey)).toBe(42_000_000n);
  });

  it("My Coins: lists the creator's coin with its pool, shows swap fees, claims them", async () => {
    const { tx, mint: kp } = await buildCreateCoinTx(conn, {
      owner: owner.publicKey, name: "Mine", symbol: "MiNe", uri: "https://x.y", decimals: 6, supply: 1_000_000n, revokeFreeze: true, revokeMint: true, revokeUpdate: true,
    }, null);
    await send(tx, [kp]);
    const pool = await buildCreatePoolTx(conn, { owner: owner.publicKey, tokenMint: kp.publicKey, tokenAmount: "900000", solAmount: "5", feeBps: 100, lockLiquidity: true }, null);
    await send(pool.tx, [pool.positionNft]);

    // a trade generates fees (OnlyB mode = fees in SOL)
    const cp = new CpAmm(conn);
    const st = await cp.fetchPoolState(pool.pool);
    const swap = await cp.swap({
      payer: owner.publicKey, pool: pool.pool, inputTokenMint: NATIVE_MINT, outputTokenMint: kp.publicKey, amountIn: new BN(1_000_000_000), minimumAmountOut: new BN(0),
      tokenAMint: st.tokenAMint, tokenBMint: st.tokenBMint, tokenAVault: st.tokenAVault, tokenBVault: st.tokenBVault,
      tokenAProgram: getTokenProgram(st.tokenAFlag), tokenBProgram: getTokenProgram(st.tokenBFlag), referralTokenAccount: null,
    });
    await send(swap);

    const coins = await findMyCoins(conn, owner.publicKey);
    const coin = coins.find((c) => c.mint.equals(kp.publicKey))!;
    expect(coin.symbol).toBe("MiNe");
    expect(coin.mintRevoked && coin.freezeRevoked && coin.immutable).toBe(true);
    expect(coin.supply).toBe(1_000_000);
    expect(coin.positions).toHaveLength(1);
    const p = coin.positions[0];
    expect(p.locked).toBe(true);
    expect(p.hasFees).toBe(true);
    expect(Number(p.feeSol)).toBeCloseTo(0.008, 3); // 1 % of 1 SOL, minus Meteora's 20 % protocol share

    const before = bal(owner.publicKey);
    await send(await buildClaimFeesTx(conn, owner.publicKey, p));
    expect(bal(owner.publicKey) - before).toBeGreaterThan(0.005 * LAMPORTS_PER_SOL);
    const after = (await findMyCoins(conn, owner.publicKey)).find((c) => c.mint.equals(kp.publicKey))!;
    expect(after.positions[0].hasFees).toBe(false);
  });

  it("default treasury on create + pool + remove is the owner's wallet", async () => {
    const { TREASURY } = await import("@/lib/config");
    const before = bal(TREASURY);
    const { tx, mint: kp } = await buildCreateCoinTx(conn, {
      owner: owner.publicKey, name: "Fees", symbol: "FEE", uri: "https://x.y", decimals: 6, supply: 1_000_000n, revokeFreeze: true, revokeMint: true, revokeUpdate: false,
    });
    await send(tx, [kp]);
    const pool = await buildCreatePoolTx(conn, { owner: owner.publicKey, tokenMint: kp.publicKey, tokenAmount: "900000", solAmount: "1", feeBps: 100, lockLiquidity: false });
    await send(pool.tx, [pool.positionNft]);
    const p = (await listPositions(conn, owner.publicKey)).find((x) => x.tokenMint.equals(kp.publicKey))!;
    await send(await buildRemoveTx(conn, owner.publicKey, p, 100));
    expect(TREASURY.toBase58()).toBe("5cnTSUAhPEfqEx9VDgfkDWsN1uf7Bc4p5eQFE6MyapPz");
    expect(bal(TREASURY) - before).toBe(coinFee({ revokeFreeze: true, revokeMint: true, revokeUpdate: false }) + FEES.createLiquidity + FEES.removeLiquidity);
  });

  it("refuses a pool while the freeze authority is live", async () => {
    const { tx, mint: kp } = await buildCreateCoinTx(conn, {
      owner: owner.publicKey, name: "Frozen", symbol: "FRZ", uri: "https://x.y", decimals: 6, supply: 1000n, revokeFreeze: false, revokeMint: false, revokeUpdate: true,
    }, null);
    await send(tx, [kp]);
    await expect(buildCreatePoolTx(conn, { owner: owner.publicKey, tokenMint: kp.publicKey, tokenAmount: "10", solAmount: "1", feeBps: 25, lockLiquidity: false }, null))
      .rejects.toThrow(/freeze/);
  });
});
