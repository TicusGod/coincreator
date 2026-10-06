// Long-form help text shown under each tool (server components, no state).
import Link from "next/link";
import { FEES, lamportsToSol } from "@/lib/config";
import { Explainer, Steps } from "@/components/ui";

const sol = (l: number) => `${lamportsToSol(l)} SOL`;

export function CreateCoinExplainer() {
  return (
    <Explainer>
      <h2>Create a Solana token in under a minute</h2>
      <p>
        CoinCreator mints a standard <strong>SPL token</strong> with full <strong>Metaplex metadata</strong> (name, symbol, image, description and socials), so it shows up correctly in
        Phantom, Solflare, Jupiter, DexScreener and every Solana explorer. No coding, no command line. One transaction, signed in your own wallet.
      </p>

      <h2>How to use CoinCreator</h2>
      <Steps
        items={[
          "Connect your Solana wallet (Phantom, Solflare, Backpack…).",
          "Enter the name of your coin.",
          "Choose the symbol (ticker), up to 10 characters.",
          "Keep 6 decimals unless you have a reason not to; it is the Solana standard.",
          "Upload the image of your coin (PNG, JPG, GIF or WebP, 4 MB max).",
          "Set the total supply. All of it lands in your wallet.",
          "Add a description and, under “Show more options”, your website, X and Telegram.",
          "Click Create Coin, approve the transaction and your coin is live a few seconds later.",
        ]}
      />

      <h3>Revoke Freeze Authority</h3>
      <p>
        A freeze authority can lock any holder&apos;s tokens. Meteora, like every serious DEX, refuses pools for freezable tokens, so revoking it is <strong>required</strong> before you{" "}
        <Link href="/create-liquidity" className="text-text underline decoration-ember/60 underline-offset-2">create liquidity</Link>. The cost is {sol(FEES.revokeFreeze)}.
      </p>

      <h3>Revoke Mint Authority</h3>
      <p>
        Revoking the mint authority guarantees that no more tokens can ever be created beyond the total supply. Buyers look for it before they ape. The cost is {sol(FEES.revokeMint)}. You can
        also keep it and revoke it later from <strong>Manage your coin</strong> above.
      </p>

      <h3>Revoke Update Authority</h3>
      <p>
        Makes the metadata immutable: the name, symbol and image can never be changed again, by anyone. The cost is {sol(FEES.revokeUpdate)}.
      </p>

      <h3>Copy a trending coin</h3>
      <p>
        Spotted a coin that is running? Open <Link href="/copy-trending" className="text-text underline decoration-ember/60 underline-offset-2">Copy Trending</Link>, hit{" "}
        <strong>Copy Coin</strong> and this form fills itself with its name, ticker, picture, description and socials. Edit anything, then create your own version.
      </p>

      <h2>What it costs</h2>
      <p>
        The service fee is {sol(FEES.createCoin)} plus the options you pick, and about 0.02 SOL of network rent paid to Solana for storing your token on chain. The total is always shown
        before you sign. All transactions are final; double-check your details before you create.
      </p>
    </Explainer>
  );
}

export function CreateLiquidityExplainer() {
  return (
    <Explainer>
      <h2>Create a Meteora liquidity pool</h2>
      <p>
        A liquidity pool is what makes your coin tradable. You deposit your tokens and some SOL; the ratio between the two sets the starting price. From that moment anyone can buy and sell
        your coin on <strong>Meteora</strong>, <strong>Jupiter</strong>, <strong>DexScreener</strong>, Phantom and every Solana wallet.
      </p>

      <h2>How to create liquidity</h2>
      <Steps
        items={[
          "Connect the wallet that holds your coin.",
          "Paste your token address (it is filled in automatically right after you create a coin).",
          "Enter how many tokens you deposit, usually 70 – 100 % of the supply.",
          "Enter how much SOL you pair with them. More SOL = higher starting price and deeper liquidity.",
          "Pick the swap fee your position earns on every trade.",
          "Click Create Liquidity and approve. Your pool is live in seconds.",
        ]}
      />

      <h3>Why Meteora DAMM v2</h3>
      <p>
        Meteora&apos;s Dynamic AMM v2 is a modern constant-product pool used by most new Solana launches. Swap fees are <strong>collected in SOL</strong> straight to your position, and the pool
        can be <strong>locked forever</strong> in the same transaction.
      </p>

      <h3>Starting price and market cap</h3>
      <p>
        Starting price = SOL deposited ÷ tokens deposited. Starting market cap = that price × total supply. Both are shown live above before you sign.
      </p>

      <h3>Lock liquidity forever</h3>
      <p>
        Locking burns your ability to withdraw: the strongest anti-rug signal you can give. You still earn and claim the swap fees on Meteora. Without the lock, you can withdraw any time from{" "}
        <Link href="/remove-liquidity" className="text-text underline decoration-ember/60 underline-offset-2">Remove Liquidity</Link>.
      </p>

      <h2>What it costs</h2>
      <p>The service fee is {sol(FEES.createLiquidity)}, plus about 0.03 SOL of rent that Meteora needs to open the pool and your position.</p>
    </Explainer>
  );
}

export function RemoveLiquidityExplainer() {
  return (
    <Explainer>
      <h2>Withdraw your Meteora liquidity</h2>
      <Steps
        items={[
          "Connect the wallet that created the pool.",
          "Your Meteora DAMM v2 positions load automatically, with the tokens and SOL you will receive.",
          "Click Remove All Liquidity and approve.",
        ]}
      />
      <p>
        In the same transaction we withdraw everything, <strong>claim your unclaimed swap fees</strong> and close the position, so its rent comes back to you too. A 5 % slippage guard protects
        the withdrawal. Locked positions cannot be withdrawn by anyone, including you. The service fee is {sol(FEES.removeLiquidity)}.
      </p>
    </Explainer>
  );
}

export function CopyTrendingExplainer() {
  return (
    <Explainer>
      <h2>How Copy Trending works</h2>
      <p>
        We pull the coins that are trending on Solana right now from <strong>DexScreener</strong> (top boosts and freshly listed profiles), with their live market cap and pair age, refreshed
        every minute.
      </p>
      <Steps
        items={[
          "Browse, search or sort the list: trending, market cap or newest.",
          "Click Copy Coin on the one you like.",
          "The Create Coin form opens pre-filled with its name, ticker, picture, description and socials.",
          "Change what you want, then create your coin and add Meteora liquidity.",
        ]}
      />
      <p>
        A copy is a brand-new token with its own address. It shares nothing with the original: not its holders, not its liquidity, not its price.
      </p>
    </Explainer>
  );
}
