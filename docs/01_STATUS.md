# COPYCAT — status

Updated: 2026-10-06

## Done
- web/ full app (Next 16): 4 screens + 4 API routes, build + tsc + eslint clean.
- `npm run test:svm` — create coin → DAMM v2 pool → list → remove all, on the REAL Metaplex + Meteora programs cloned into LiteSVM (4/4).
- `npm test` — routes called directly against live DexScreener, upload guards (host allowlist, origin, type sniff), RPC method allowlist (8/8).

## Left
- Name/brand (COPYCAT is a working name), logo (`ops/site.sh logo`).
- Treasury wallet (`ops/wallet.sh new treasury` or owner's address) → `NEXT_PUBLIC_TREASURY`.
- Create Coin service fee = 0.5 SOL (owner 2026-10-06); options + liquidity fees still placeholders (env `NEXT_PUBLIC_FEE_*`).
- Vercel project + env, then one real mainnet run with a tiny amount.
- Not visually checked in a browser yet (no local server rule) — check on the first Vercel preview.

## Wallets (public addresses only — `ops/wallet.sh list`)
- none yet

## Keys the owner must provide
- `RPC_URL` (keyed mainnet RPC, server only). `PINATA_JWT` exists in ~/.secrets/pinata.env.

## Risks
- Copy Coin clones other teams' names/images: user-generated, no trademark filter.
- DexScreener rate limits (60/min boosts) — mitigated by 60 s cache.
