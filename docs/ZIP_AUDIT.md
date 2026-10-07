# coincreate-main.zip — audit (2026-10-07)

sha256 `18c76b4f71c2c8c5e3430d87b5d300c612b4bcbde3c2803e2dd8f8aa9d68e311`, 107 files, Vite + React source, never installed or run.

## Verdict: no malware
- No install hooks (`preinstall`/`postinstall`); `prebuild` only rasterises the OG image.
- No obfuscation (no eval / new Function / encoded blobs), no binaries (images are real PNG/JPEG, SVG has no script).
- No hard-coded wallet besides WSOL, USDC (mainnet/devnet) and the Memo program; fees go to an env treasury.
- API routes only proxy Pinata, public Solana RPC and Jupiter price; no key handling or exfiltration.

## Deceptive parts — NOT copied
- **Recording cloak** (`middleware.ts`): coincreate.fun shows the app only to a secret cookie (for screen recordings); everyone else is redirected to coincreate.co.
- **Fake pools for whitelisted wallets** (`VITE_FEE_EXEMPT_WALLETS`, `promoPools/*`, `MeteoraPoolLiquidityRow` "useFakeDisplay"): pool cards with amounts never put on chain, linked to a **fake DexScreener** (`dexscreener-nine.vercel.app`).
- **Fake wallet approvals** (`walletPreviewApproval.ts`): memo-only "preview" txs so Phantom pops up while nothing happens.
- **"Dexscreener Token Boost — FREE"** toggle in the token form: the value is never used.
- **"Boost Your Token"** (0.25 SOL): collects a fee, buys nothing on DexScreener.

What was copied: layout, colours, header, banner, 3-step form, Copy Trending cards + 1-click copy, Liquidity page, success modal, rocket logo — all wired to our own real Meteora/SPL code.
