// Single source of truth for launch-day values. Edit with ops/site.sh, never by hand in components.
import raw from "@/site.config.json";

export type SiteStatus = "prelaunch" | "live" | "paused";
export type Chain = "robinhood" | "solana";

export const site = raw as {
  name: string;
  chain: Chain;
  status: SiteStatus;
  url: string | null;
  ca: string | null;
  x: string | null;
  logo: string | null;
  email: string | null;
  telegram: string | null;
  banner: string | null;
};

const EXPLORERS: Record<Chain, (addr: string) => string> = {
  robinhood: (a) => `https://robinhoodchain.blockscout.com/token/${a}`,
  solana: (a) => `https://solscan.io/token/${a}`,
};

export const explorerUrl = (addr: string) => EXPLORERS[site.chain](addr);
export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
