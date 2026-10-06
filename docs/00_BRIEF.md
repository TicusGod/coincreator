# COPYCAT — brief (working name)

1. Pitch: oriontools.io, but pools go on **Meteora DAMM v2** instead of Raydium, plus **Copy Trending** (clone a trending coin's name/ticker/image/socials in one click, data from DexScreener).
2. Why it wins vs the reference: Orion has no copy flow and only Raydium; Meteora DAMM v2 pools charge swap fees paid in SOL to the creator and can be locked forever (trust signal).
3. Mechanism v1:
   - **Create Coin** (home) — classic SPL mint + Metaplex metadata + full supply to the creator, one tx. Options: revoke freeze (default on, required for a pool), revoke mint (default on), revoke update.
   - **Create Liquidity** — DAMM v2 customizable pool TOKEN/SOL, full range, fee tier 0.25/1/2/4 %, fees collected in SOL, optional permanent lock.
   - **Remove Liquidity** — lists the wallet's DAMM v2 positions, withdraw-all + claim fees + close position (95 % slippage guard).
   - **Copy Trending** — DexScreener top boosts + latest profiles (Solana), enriched with pairs (mcap, pair age, image, socials) → "Copy Coin" opens Create Coin prefilled; the picture is re-pinned to IPFS server-side.
   Removed vs Orion (owner, 2026-10-06): Swap, Burn, Burn & Earn, Leaderboard, the "Leaderboard is live" banner.
4. Architecture: A) **chosen** — everything signed client-side in the user's wallet, fees = SOL transfer to the treasury inside the same tx; Vercel routes only for DexScreener (60 s cache), Pinata upload, RPC proxy (key hidden). B) backend on the VPS building txs — rejected, nothing needs server state. No program of our own.
5. Programs used: SPL Token, Metaplex Token Metadata (metaq…), Meteora DAMM v2 (cpamd…). Nothing to deploy.
6. Web routes: `/` Create Coin (`?copy=<mint>`), `/create-liquidity` (`?mint=`), `/remove-liquidity`, `/copy-trending`; API `/api/trending`, `/api/coin/[address]`, `/api/upload`, `/api/rpc`.
7. Brand direction: matches the owner's Copy Trending screen — #111113 background, #18181b cards, mint-green #6ef2a8 accent, orange pair age.
8. Launch sequence: treasury wallet → Vercel env → deploy → one real create + pool + remove with a small amount.

Chain: solana
