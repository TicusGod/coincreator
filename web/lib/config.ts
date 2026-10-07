// Public, client-safe settings. Fees are charged as a SOL transfer to the treasury inside the user's own transaction.
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { site } from "@/lib/site-config";

const sol = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Math.round((Number.isFinite(n) && n >= 0 ? n : fallback) * LAMPORTS_PER_SOL);
};

/** Fees in lamports — same schedule as the coincreate.cc reference (2026-10-07). Override with NEXT_PUBLIC_FEE_* (in SOL). */
export const FEES = {
  /** Promo create fee (see createCoinFee for the live value). */
  createCoin: sol(process.env.NEXT_PUBLIC_FEE_CREATE_SOL, site.promo?.createFeeSol ?? 0.1),
  createCoinRegular: sol(process.env.NEXT_PUBLIC_FEE_CREATE_REGULAR_SOL, site.promo?.regularCreateFeeSol ?? 0.2),
  revokeFreeze: sol(process.env.NEXT_PUBLIC_FEE_REVOKE_FREEZE_SOL, 0.1),
  revokeMint: sol(process.env.NEXT_PUBLIC_FEE_REVOKE_MINT_SOL, 0.1),
  revokeUpdate: sol(process.env.NEXT_PUBLIC_FEE_REVOKE_UPDATE_SOL, 0.1),
  modifyCreator: sol(process.env.NEXT_PUBLIC_FEE_MODIFY_CREATOR_SOL, 0.1),
  /** Flat price of a 1-click copy (freeze, mint and update all revoked included). */
  copyTrending: sol(process.env.NEXT_PUBLIC_FEE_COPY_TRENDING_SOL, 0.5),
  createLiquidity: sol(process.env.NEXT_PUBLIC_FEE_CREATE_LIQUIDITY_SOL, 0.1),
  removeLiquidity: sol(process.env.NEXT_PUBLIC_FEE_REMOVE_LIQUIDITY_SOL, 0.1),
  mintMore: sol(process.env.NEXT_PUBLIC_FEE_MINT_MORE_SOL, 0.1),
} as const;

/** Where every service fee goes: the owner's wallet (2026-10-07). NEXT_PUBLIC_TREASURY can override it. */
const DEFAULT_TREASURY = "5cnTSUAhPEfqEx9VDgfkDWsN1uf7Bc4p5eQFE6MyapPz";
export const TREASURY: PublicKey = new PublicKey(process.env.NEXT_PUBLIC_TREASURY || DEFAULT_TREASURY);

export const PRIORITY_MICRO_LAMPORTS = 50_000;

export const lamportsToSol = (l: number) => +(l / LAMPORTS_PER_SOL).toFixed(4);

const PROMO_ENDS_AT = site.promo ? Date.parse(site.promo.endsAt) : 0;

/** Live create-coin fee: the promo price until the promo ends, then the regular price. */
export function createCoinFee(now = Date.now()): number {
  return site.promo && now < PROMO_ENDS_AT ? FEES.createCoin : FEES.createCoinRegular;
}

/** Whole hours left in the promo (0 when it is over). */
export function promoHoursLeft(now = Date.now()): number {
  return site.promo && now < PROMO_ENDS_AT ? Math.ceil((PROMO_ENDS_AT - now) / 3_600_000) : 0;
}
