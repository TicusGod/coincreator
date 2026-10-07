# CoinCreator (coincreator.fun) — status

Updated: 2026-10-06

## Done
- web/ full app (Next 16): 4 screens + 4 API routes, build + tsc + eslint clean.
- `npm run test:svm` — create coin → DAMM v2 pool → list → remove all, on the REAL Metaplex + Meteora programs cloned into LiteSVM (4/4).
- `npm test` — routes called directly against live DexScreener, upload guards (host allowlist, origin, type sniff), RPC method allowlist (8/8).

- My Coins (/my-coins): coins whose Metaplex update authority = wallet (wallet token accounts + Meteora positions, any RPC), CA copy, DexScreener market data, position value, unclaimed fees + Claim fees (no service fee). Fixed: fully locked positions crashed listPositions (SDK refuses zero liquidityDelta).

- 2026-10-07 UI = owner's coincreate-main.zip (audited, see docs/ZIP_AUDIT.md): top header + marquee banner, 3-step token form, 1-click Copy Trending (mints at once), Liquidity page (token picker, 50/90/Max, Your Pools, claim, remove 25/50/75/100 %), rocket logo. Partial remove tested in LiteSVM.

## Left
- Name = CoinCreator, domain coincreator.fun (owner 2026-10-06). Logo = Higgsfield cat+lightning mark (brand/).
- Create Coin = 0.3 SOL base, 0.5 SOL with revoke freeze + revoke mint (0.1 each) (owner 2026-10-06); options + liquidity fees still placeholders (env `NEXT_PUBLIC_FEE_*`).
- Vercel project + env, then one real mainnet run with a tiny amount.
- Not visually checked in a browser yet (no local server rule) — check on the first Vercel preview.

## Wallets (public addresses only — `ops/wallet.sh list`)
- treasury `BQffuxULJy2qu4PfxuJt5Yj92rCU8wCDc7gfnFGmKGD5` (receives every service fee; default in web/lib/config.ts, keys ~/.copycat-keys)

## Keys the owner must provide (owner 2026-10-06: Privy + Helius + Pinata, keys coming)
- `NEXT_PUBLIC_PRIVY_APP_ID` — Privy app; in the Privy dashboard allow the domains coincreator.fun + localhost:3123, enable email + Solana wallets.
- `RPC_URL` — Helius mainnet URL (server only, behind /api/rpc).
- `PINATA_JWT` — owner's own key (an older one exists in ~/.secrets/pinata.env, not used unless told).
- Store with `printf %s "$V" | ops/secrets.sh set <service> <KEY>`.

## Risks
- ipfs.io stopped serving files (2026): metadata uses IPFS_GATEWAY (dedicated Pinata gateway); never ship ipfs.io URIs.
- Copy Coin clones other teams' names/images: user-generated, no trademark filter.
- DexScreener rate limits (60/min boosts) — mitigated by 60 s cache.
