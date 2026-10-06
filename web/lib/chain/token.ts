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
  return FEES.createCoin + (o.revokeFreeze ? FEES.revokeFreeze : 0) + (o.revokeMint ? FEES.revokeMint : 0) + (o.revokeUpdate ? FEES.revokeUpdate : 0);
}

/** Returns an unsigned tx; the caller sends it with `mint` as an extra signer. */
export async function buildCreateCoinTx(conn: Connection, p: CreateCoinParams, treasury = TREASURY) {
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
