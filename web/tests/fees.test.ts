// Every service fee the UI can charge must land on the owner's wallet (no fee path may skip or redirect it).
import { describe, expect, it } from "vitest";
import { Keypair, PublicKey, SystemInstruction, SystemProgram, type Transaction } from "@solana/web3.js";
import { buildMintMoreTx, buildRevokeMintTx, coinFee } from "@/lib/chain/token";
import { FEES, TREASURY } from "@/lib/config";

const OWNER_WALLET = "5cnTSUAhPEfqEx9VDgfkDWsN1uf7Bc4p5eQFE6MyapPz";

function feeTransfers(tx: Transaction) {
  return tx.instructions
    .filter((ix) => ix.programId.equals(SystemProgram.programId) && SystemInstruction.decodeInstructionType(ix) === "Transfer")
    .map((ix) => SystemInstruction.decodeTransfer(ix));
}

describe("service fees", () => {
  it("default treasury is the owner's wallet", () => {
    expect(TREASURY.toBase58()).toBe(OWNER_WALLET);
  });

  it("revoke mint and mint more pay the owner's wallet", () => {
    const owner = Keypair.generate().publicKey;
    const mint = Keypair.generate().publicKey;
    for (const [tx, fee] of [[buildRevokeMintTx(owner, mint), FEES.revokeMint], [buildMintMoreTx(owner, mint, 6, "10"), FEES.mintMore]] as const) {
      const t = feeTransfers(tx);
      expect(t).toHaveLength(1);
      expect(t[0].toPubkey.toBase58()).toBe(OWNER_WALLET);
      expect(Number(t[0].lamports)).toBe(fee);
    }
  });

  it("prices match coincreate.cc: create 0.1, +0.1 per option, copy 0.5 flat, pool 0.1, remove 0.1", () => {
    expect(coinFee({ revokeFreeze: false, revokeMint: false, revokeUpdate: false })).toBe(0.1e9);
    expect(coinFee({ revokeFreeze: true, revokeMint: true, revokeUpdate: true })).toBe(0.4e9); // form default
    expect(coinFee({ revokeFreeze: true, revokeMint: true, revokeUpdate: true, modifyCreator: true })).toBe(0.5e9);
    expect(FEES.copyTrending).toBe(0.5e9);
    expect(FEES.createLiquidity).toBe(0.1e9);
    expect(FEES.removeLiquidity).toBe(0.1e9);
    expect(new PublicKey(OWNER_WALLET).toBase58()).toBe(OWNER_WALLET);
  });
});
