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
- **fees → owner wallet `5cnTSUAhPEfqEx9VDgfkDWsN1uf7Bc4p5eQFE6MyapPz`** (owner 2026-10-07; default in web/lib/config.ts). Old project treasury BQffux… never received anything, unused.

## Keys (vault ~/.secrets/coincreator.env → `ops/secrets.sh use coincreator`)
- PINATA_JWT / PINATA_API_KEY / PINATA_API_SECRET — owner's coincreator Pinata account (given 2026-10-07, verified). Account shows no dedicated gateway → IPFS_GATEWAY unset, default gateway.pinata.cloud (works, ~5 s, rate-limited). Owner to create a dedicated gateway and send the domain.
- RPC_URL — Helius mainnet (verified; server-side only, behind /api/rpc).
- Still missing: NEXT_PUBLIC_PRIVY_APP_ID.
- Keys were pasted in chat on 2026-10-07 → owner should rotate them before launch.

## Risks
- ipfs.io stopped serving files (2026): metadata uses IPFS_GATEWAY (dedicated Pinata gateway); never ship ipfs.io URIs.
- Copy Coin clones other teams' names/images: user-generated, no trademark filter.
- DexScreener rate limits (60/min boosts) — mitigated by 60 s cache.
