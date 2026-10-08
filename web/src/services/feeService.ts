import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import { env } from '../config/env';

export type FeeKind =
  | 'token_creation'
  | 'modify_creator'
  | 'copy_trending'
  | 'add_liquidity'
  | 'remove_liquidity'
  | 'revoke_mint'
  | 'revoke_freeze'
  | 'revoke_update'
  | 'dex_boost';

const kindToSol: Record<FeeKind, () => number> = {
  token_creation: () => env.fees.tokenCreationSol,
  modify_creator: () => env.fees.modifyCreatorSol,
  copy_trending: () => env.fees.copyTrendingSol,
  add_liquidity: () => env.fees.addLiquiditySol,
  remove_liquidity: () => env.fees.removeLiquiditySol,
  revoke_mint: () => env.fees.revokeMintSol,
  revoke_freeze: () => env.fees.revokeFreezeSol,
  revoke_update: () => env.fees.revokeUpdateSol,
  dex_boost: () => env.fees.dexBoostSol,
};

/** Same fee for every wallet (whitelisted wallets pay too, to `env.getFeeDestination`). */
export function getFeeLamports(kind: FeeKind, multiplier = 1): number {
  const sol = kindToSol[kind]() * multiplier;
  return Math.round(sol * LAMPORTS_PER_SOL);
}

export function buildFeeTransferInstruction(
  payer: PublicKey,
  kind: FeeKind,
  multiplier = 1,
): TransactionInstruction | null {
  const lamports = getFeeLamports(kind, multiplier);
  return buildTreasuryTransferInstruction(payer, lamports);
}

export function buildTreasuryTransferInstruction(
  payer: PublicKey,
  lamports: number,
): TransactionInstruction | null {
  if (lamports <= 0) return null;
  const treasury = env.getFeeDestination(payer);
  if (treasury.equals(payer)) {
    throw new Error('Platform treasury wallet must not match the connected wallet.');
  }
  return SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: treasury,
    lamports,
  });
}

/** 0.00001 SOL — smallest practical transfer so fee-exempt promo actions still open the wallet. */
export const PROMO_NOMINAL_ACTION_LAMPORTS = 10_000;

export function buildPromoNominalSolTransferInstruction(payer: PublicKey): TransactionInstruction {
  return SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: env.getFeeDestination(payer),
    lamports: PROMO_NOMINAL_ACTION_LAMPORTS,
  });
}

/** Fee-exempt boost: 0.00001 SOL system transfer to the same wallet so the user still signs a real transfer. */
export function buildFeeExemptBoostSelfTransferInstruction(payer: PublicKey): TransactionInstruction {
  return SystemProgram.transfer({
    fromPubkey: payer,
    toPubkey: payer,
    lamports: PROMO_NOMINAL_ACTION_LAMPORTS,
  });
}

/** One treasury transfer for the sum of all fee kinds (same total lamports as separate transfers). */
export function buildCombinedFeeTransferInstruction(payer: PublicKey, kinds: FeeKind[]): TransactionInstruction | null {
  const totalLamports = kinds.reduce((sum, k) => sum + getFeeLamports(k, 1), 0);
  return buildTreasuryTransferInstruction(payer, totalLamports);
}

export function calculateTotalFees(actions: FeeKind[]): {
  totalSol: number;
  totalLamports: number;
  breakdown: { kind: FeeKind; sol: number }[];
} {
  const breakdown = actions.map((kind) => ({
    kind,
    sol: kindToSol[kind](),
  }));
  const totalSol = breakdown.reduce((a, b) => a + b.sol, 0);
  return {
    totalSol,
    totalLamports: Math.round(totalSol * LAMPORTS_PER_SOL),
    breakdown,
  };
}
