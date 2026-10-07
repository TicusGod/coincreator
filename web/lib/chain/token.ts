// Create Coin: classic SPL mint + Metaplex metadata + full supply minted to the creator, all in one transaction.
import { ComputeBudgetProgram, Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  AuthorityType,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMint2Instruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { FEES, PRIORITY_MICRO_LAMPORTS, TREASURY } from "@/lib/config";
import { createMetadataV3Ix } from "./metaplex";

export interface CoinOptions {
  revokeFreeze: boolean;
  revokeMint: boolean;
  revokeUpdate: boolean;
  /** Creator name/website written into the metadata JSON (paid option). */
  modifyCreator?: boolean;
}

export interface CreateCoinParams extends CoinOptions {
  owner: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  supply: bigint; // whole tokens
}

export function coinFee(o: CoinOptions): number {
  return (
    FEES.createCoin +
    (o.revokeFreeze ? FEES.revokeFreeze : 0) +
    (o.revokeMint ? FEES.revokeMint : 0) +
    (o.revokeUpdate ? FEES.revokeUpdate : 0) +
    (o.modifyCreator ? FEES.modifyCreator : 0)
  );
}

/** Returns an unsigned tx; the caller sends it with `mint` as an extra signer. */
export async function buildCreateCoinTx(conn: Connection, p: CreateCoinParams, treasury: PublicKey | null = TREASURY) {
  if (p.decimals < 0 || p.decimals > 9) throw new Error("Decimals must be between 0 and 9");
  const raw = p.supply * BigInt(10) ** BigInt(p.decimals);
  if (p.supply <= BigInt(0) || raw > BigInt("18446744073709551615")) throw new Error("Supply is out of range");

  const mint = Keypair.generate();
  const ata = getAssociatedTokenAddressSync(mint.publicKey, p.owner);
  const rent = await conn.getMinimumBalanceForRentExemption(MINT_SIZE);

  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 120_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_MICRO_LAMPORTS }),
    SystemProgram.createAccount({ fromPubkey: p.owner, newAccountPubkey: mint.publicKey, space: MINT_SIZE, lamports: rent, programId: TOKEN_PROGRAM_ID }),
    createInitializeMint2Instruction(mint.publicKey, p.decimals, p.owner, p.revokeFreeze ? null : p.owner),
    createMetadataV3Ix({ mint: mint.publicKey, authority: p.owner, name: p.name, symbol: p.symbol, uri: p.uri, isMutable: !p.revokeUpdate }),
    createAssociatedTokenAccountIdempotentInstruction(p.owner, ata, p.owner, mint.publicKey),
    createMintToInstruction(mint.publicKey, ata, p.owner, raw),
  );
  if (p.revokeMint) tx.add(createSetAuthorityInstruction(mint.publicKey, p.owner, AuthorityType.MintTokens, null));
  const fee = coinFee(p);
  if (treasury && fee > 0) tx.add(SystemProgram.transfer({ fromPubkey: p.owner, toPubkey: treasury, lamports: fee }));
  tx.feePayer = p.owner;
  return { tx, mint };
}

// ---------- Manage an existing coin (tokens whose mint authority is the connected wallet) ----------

export interface MintableToken {
  mint: PublicKey;
  decimals: number;
  supply: string; // UI units
  name: string;
  symbol: string;
}

/** SPL tokens held by `owner` whose mint authority is still `owner`. */
export async function listMintableTokens(conn: Connection, owner: PublicKey, labels: (mints: PublicKey[]) => Promise<{ name: string; symbol: string }[]>): Promise<MintableToken[]> {
  const accs = await conn.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID });
  const mints = [...new Set(accs.value.map((a) => a.account.data.parsed.info.mint as string))].map((m) => new PublicKey(m));
  if (!mints.length) return [];
  const infos: Awaited<ReturnType<Connection["getMultipleParsedAccounts"]>>["value"] = [];
  for (let i = 0; i < mints.length; i += 100) infos.push(...(await conn.getMultipleParsedAccounts(mints.slice(i, i + 100))).value);
  const own = mints
    .map((mint, i) => ({ mint, info: infos[i]?.data && "parsed" in infos[i]!.data ? (infos[i]!.data as { parsed: { info: { mintAuthority: string | null; decimals: number; supply: string } } }).parsed.info : null }))
    .filter((m) => m.info?.mintAuthority === owner.toBase58());
  const names = await labels(own.map((m) => m.mint));
  return own.map((m, i) => ({
    mint: m.mint,
    decimals: m.info!.decimals,
    supply: (Number(m.info!.supply) / 10 ** m.info!.decimals).toLocaleString("en-US"),
    ...names[i],
  }));
}

function withFee(tx: Transaction, owner: PublicKey, fee: number, treasury: PublicKey | null) {
  if (treasury && fee > 0) tx.add(SystemProgram.transfer({ fromPubkey: owner, toPubkey: treasury, lamports: fee }));
  tx.feePayer = owner;
  return tx;
}

export function buildRevokeMintTx(owner: PublicKey, mint: PublicKey, treasury: PublicKey | null = TREASURY) {
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_MICRO_LAMPORTS }),
    createSetAuthorityInstruction(mint, owner, AuthorityType.MintTokens, null),
  );
  return withFee(tx, owner, FEES.revokeMint, treasury);
}

/** Mints `amount` whole tokens (UI units, may have decimals) to the owner's wallet. */
export function buildMintMoreTx(owner: PublicKey, mint: PublicKey, decimals: number, amount: string, treasury: PublicKey | null = TREASURY) {
  const [int, frac = ""] = amount.trim().split(".");
  if (!/^\d+$/.test(int || "") || !/^\d*$/.test(frac) || frac.length > decimals) throw new Error("Invalid amount");
  const raw = BigInt(int + frac.padEnd(decimals, "0"));
  if (raw <= BigInt(0)) throw new Error("Amount must be greater than 0");
  const ata = getAssociatedTokenAddressSync(mint, owner);
  const tx = new Transaction().add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY_MICRO_LAMPORTS }),
    createAssociatedTokenAccountIdempotentInstruction(owner, ata, owner, mint),
    createMintToInstruction(mint, ata, owner, raw),
  );
  return withFee(tx, owner, FEES.mintMore, treasury);
}
