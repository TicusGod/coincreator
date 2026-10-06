// Wallet signs + sends; we confirm by polling (the RPC proxy is HTTP-only, no websocket).
import type { Connection, Keypair, Transaction } from "@solana/web3.js";
import type { AppWallet } from "@/lib/client/wallet";

export async function sendAndConfirm(wallet: AppWallet, conn: Connection, tx: Transaction, signers: Keypair[] = []): Promise<string> {
  if (!wallet.publicKey) throw new Error("Connect your wallet first");
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = wallet.publicKey;
  if (signers.length) tx.partialSign(...signers);
  const signed = await wallet.sign(tx);
  const signature = await conn.sendRawTransaction(signed.serialize(), { preflightCommitment: "confirmed", maxRetries: 3 });

  for (;;) {
    const { value } = await conn.getSignatureStatuses([signature]);
    const s = value[0];
    if (s?.err) throw new Error("Transaction failed on chain. Nothing was charged except the network fee.");
    if (s?.confirmationStatus === "confirmed" || s?.confirmationStatus === "finalized") return signature;
    if ((await conn.getBlockHeight("confirmed")) > lastValidBlockHeight) throw new Error("Transaction expired. Please try again.");
    await new Promise((r) => setTimeout(r, 1500));
  }
}

/** Turns wallet/RPC errors into one short sentence for the user. */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/reject|denied|cancel/i.test(msg)) return "You cancelled the request in your wallet.";
  if (/insufficient (funds|lamports)|0x1\b/i.test(msg)) return "Not enough SOL in your wallet for this transaction.";
  if (/blockhash|expired/i.test(msg)) return "Transaction expired. Please try again.";
  return msg.length > 160 ? "Something went wrong. Please try again." : msg;
}

export const solscanTx = (sig: string) => `https://solscan.io/tx/${sig}`;
export const solscanToken = (mint: string) => `https://solscan.io/token/${mint}`;
