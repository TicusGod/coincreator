// Two-step flow: the service fee is paid in its own plain SOL transfer (with a memo saying what it is), then the coin
// is created in a second transaction that contains no transfer to us. A paid-but-unused fee is remembered per wallet,
// so a failed or abandoned creation never makes the user pay twice.
import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import type { WalletContextState } from '@solana/wallet-adapter-react';
import { env } from '../config/env';


const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

export type PaidAction = 'create' | 'copy';

interface Credit {
  lamports: number;
  signature: string;
  at: number;
}

const storageKey = (owner: PublicKey, action: PaidAction) => `cc_service_credit_v1_${env.network}_${owner.toBase58()}_${action}`;

function readCredit(owner: PublicKey, action: PaidAction): Credit | null {
  try {
    const raw = localStorage.getItem(storageKey(owner, action));
    if (!raw) return null;
    const c = JSON.parse(raw) as Credit;
    return typeof c.lamports === 'number' && c.lamports > 0 ? c : null;
  } catch {
    return null;
  }
}

function writeCredit(owner: PublicKey, action: PaidAction, credit: Credit | null) {
  try {
    if (credit && credit.lamports > 0) localStorage.setItem(storageKey(owner, action), JSON.stringify(credit));
    else localStorage.removeItem(storageKey(owner, action));
  } catch {
    /* storage unavailable: the user would pay again only if they reload before creating */
  }
}

/** Lamports already paid and not yet used for this action. */
export function getServiceCredit(owner: PublicKey | null | undefined, action: PaidAction): number {
  return owner ? readCredit(owner, action)?.lamports ?? 0 : 0;
}

/** Call after a successful creation that used the prepaid fee. */
export function consumeServiceCredit(owner: PublicKey, action: PaidAction, lamports: number) {
  const c = readCredit(owner, action);
  if (!c) return;
  writeCredit(owner, action, { ...c, lamports: c.lamports - lamports });
}

/**
 * Pays what is missing so the credit covers `requiredLamports` (nothing if it already does).
 * One system transfer to the treasury + a memo describing the payment. Returns once confirmed.
 */
export async function payServiceFee(params: {
  connection: Connection;
  wallet: WalletContextState;
  action: PaidAction;
  requiredLamports: number;
  label: string;
}): Promise<{ paidLamports: number; signature: string | null }> {
  const { connection, wallet, action, requiredLamports, label } = params;
  const payer = wallet.publicKey;
  if (!payer || !wallet.sendTransaction) throw new Error('Wallet not connected');
  const existing = readCredit(payer, action);
  const missing = requiredLamports - (existing?.lamports ?? 0);
  if (missing <= 0) return { paidLamports: 0, signature: existing?.signature ?? null };

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  const msg = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 30_000 }),
      SystemProgram.transfer({ fromPubkey: payer, toPubkey: env.getTreasury(), lamports: missing }),
      new TransactionInstruction({
        programId: MEMO_PROGRAM_ID,
        keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
        data: Buffer.from(`coincreator.fun service fee: ${label}`, 'utf8'),
      }),
    ],
  }).compileToV0Message();

  const signature = await wallet.sendTransaction(new VersionedTransaction(msg), connection, { preflightCommitment: 'confirmed' });
  // Unlock creation only for a payment that is confirmed on chain and did not fail.
  for (;;) {
    const { value } = await connection.getSignatureStatuses([signature]);
    const st = value[0];
    if (st?.err) throw new Error('The payment transaction failed. Nothing was charged except the network fee.');
    if (st?.confirmationStatus === 'confirmed' || st?.confirmationStatus === 'finalized') break;
    if ((await connection.getBlockHeight('confirmed')) > lastValidBlockHeight) throw new Error('The payment expired before it was confirmed. Please try again.');
    await new Promise((r) => setTimeout(r, 1500));
  }
  writeCredit(payer, action, { lamports: requiredLamports, signature, at: Date.now() });
  return { paidLamports: missing, signature };
}
