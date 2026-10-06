// Public, client-safe settings. Fees are charged as a SOL transfer to the treasury inside the user's own transaction.
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

const sol = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Math.round((Number.isFinite(n) && n >= 0 ? n : fallback) * LAMPORTS_PER_SOL);
};

/** Fees in lamports. Override with NEXT_PUBLIC_FEE_* (in SOL). */
export const FEES = {
  createCoin: sol(process.env.NEXT_PUBLIC_FEE_CREATE_SOL, 0.3),
  revokeFreeze: sol(process.env.NEXT_PUBLIC_FEE_REVOKE_FREEZE_SOL, 0.1),
  revokeMint: sol(process.env.NEXT_PUBLIC_FEE_REVOKE_MINT_SOL, 0.1),
  revokeUpdate: sol(process.env.NEXT_PUBLIC_FEE_REVOKE_UPDATE_SOL, 0.1),
  mintMore: sol(process.env.NEXT_PUBLIC_FEE_MINT_MORE_SOL, 0.1),
  createLiquidity: sol(process.env.NEXT_PUBLIC_FEE_CREATE_LIQUIDITY_SOL, 0.2),
  removeLiquidity: sol(process.env.NEXT_PUBLIC_FEE_REMOVE_LIQUIDITY_SOL, 0.05),
} as const;

/** Where fees go. Unset = fees are skipped (sample/dev mode) and the UI says so. */
export const TREASURY: PublicKey | null = (() => {
  try {
    return process.env.NEXT_PUBLIC_TREASURY ? new PublicKey(process.env.NEXT_PUBLIC_TREASURY) : null;
  } catch {
    return null;
  }
})();

export const PRIORITY_MICRO_LAMPORTS = 50_000;

export const lamportsToSol = (l: number) => +(l / LAMPORTS_PER_SOL).toFixed(4);
