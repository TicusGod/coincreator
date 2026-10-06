/**
 * Create Coin → Create Liquidity → Remove Liquidity against the REAL mainnet Metaplex + Meteora DAMM v2 programs
 * cloned into LiteSVM. Fresh keypairs; the network is only read to clone programs.  npm run test:svm
 */
import { beforeAll, describe, expect, it } from "vitest";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, type Transaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, unpackMint } from "@solana/spl-token";
import { LiteSVM, Rent } from "litesvm";
import { buildCreateCoinTx, coinFee } from "@/lib/chain/token";
import { buildCreatePoolTx, buildRemoveTx, listPositions } from "@/lib/chain/meteora";
import { METADATA_PROGRAM_ID, metadataPda } from "@/lib/chain/metaplex";
import { FEES } from "@/lib/config";
import { svmConnection, type SvmConn } from "./support/svm-conn";

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
    const solBefore = bal(owner.publicKey);
    await send(await buildRemoveTx(conn, owner.publicKey, p, treasury.publicKey));
    expect(tokens(mint)).toBeGreaterThan(999_000_000n * 1_000_000n);
    expect(bal(owner.publicKey) - solBefore).toBeGreaterThan(1.9 * LAMPORTS_PER_SOL);
    expect(await listPositions(conn, owner.publicKey)).toHaveLength(0);
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
