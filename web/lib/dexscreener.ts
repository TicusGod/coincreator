// Server-side DexScreener reads. Trending = top boosted + latest profiles on Solana, enriched with live pair data.
// Limits: boosts/profiles 60 req/min, tokens 300 req/min — callers cache for 60 s.
import { z } from "zod";

const API = "https://api.dexscreener.com";

const Link = z.object({ type: z.string().optional(), label: z.string().optional(), url: z.string() });
const Listing = z.object({
  chainId: z.string(),
  tokenAddress: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  links: z.array(Link).nullish(),
});
const Pair = z.object({
  pairAddress: z.string(),
  url: z.string().optional(),
  baseToken: z.object({ address: z.string(), name: z.string(), symbol: z.string() }),
  marketCap: z.number().nullish(),
  fdv: z.number().nullish(),
  liquidity: z.object({ usd: z.number().nullish() }).nullish(),
  pairCreatedAt: z.number().nullish(),
  info: z
    .object({
      imageUrl: z.string().nullish(),
      websites: z.array(Link).nullish(),
      socials: z.array(Link).nullish(),
    })
    .nullish(),
});

export interface CoinInfo {
  address: string;
  name: string;
  symbol: string;
  description: string;
  imageUrl: string | null;
  marketCap: number | null;
  pairCreatedAt: number | null;
  website: string | null;
  twitter: string | null;
  telegram: string | null;
  dexUrl: string;
}

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(`${API}${path}`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`DexScreener ${res.status}`);
  return res.json();
}

const pick = (links: z.infer<typeof Link>[], test: (l: z.infer<typeof Link>) => boolean) => links.find(test)?.url ?? null;

/** Live pair data for up to 30 addresses per call; keeps the most liquid pair per token. */
async function pairsFor(addresses: string[]): Promise<Map<string, z.infer<typeof Pair>>> {
  const best = new Map<string, z.infer<typeof Pair>>();
  for (let i = 0; i < addresses.length; i += 30) {
    const raw = await getJson(`/tokens/v1/solana/${addresses.slice(i, i + 30).join(",")}`);
    for (const item of z.array(z.unknown()).parse(raw)) {
      const p = Pair.safeParse(item);
      if (!p.success) continue;
      const key = p.data.baseToken.address;
      const cur = best.get(key);
      if (!cur || (p.data.liquidity?.usd ?? 0) > (cur.liquidity?.usd ?? 0)) best.set(key, p.data);
    }
  }
  return best;
}

function toCoin(address: string, pair: z.infer<typeof Pair> | undefined, listing?: z.infer<typeof Listing>): CoinInfo | null {
  if (!pair) return null;
  const links = [...(listing?.links ?? []), ...(pair.info?.websites ?? []), ...(pair.info?.socials ?? [])];
  return {
    address,
    name: pair.baseToken.name,
    symbol: pair.baseToken.symbol,
    description: listing?.description ?? "",
    imageUrl: pair.info?.imageUrl ?? null,
    marketCap: pair.marketCap ?? pair.fdv ?? null,
    pairCreatedAt: pair.pairCreatedAt ?? null,
    website: pick(links, (l) => !l.type && /website/i.test(l.label ?? "website")),
    twitter: pick(links, (l) => l.type === "twitter" || /(^|\/\/)(x|twitter)\.com\//.test(l.url)),
    telegram: pick(links, (l) => l.type === "telegram" || /t\.me\//.test(l.url)),
    dexUrl: pair.url ?? `https://dexscreener.com/solana/${address}`,
  };
}

/** Solana listings (top boosts first, then latest profiles); these carry the description and links. */
async function listings(): Promise<Map<string, z.infer<typeof Listing>>> {
  const [boosts, profiles] = await Promise.all([getJson("/token-boosts/top/v1"), getJson("/token-profiles/latest/v1")]);
  const out = new Map<string, z.infer<typeof Listing>>();
  for (const item of [...z.array(z.unknown()).parse(boosts), ...z.array(z.unknown()).parse(profiles)]) {
    const l = Listing.safeParse(item);
    if (l.success && l.data.chainId === "solana" && !out.has(l.data.tokenAddress)) out.set(l.data.tokenAddress, l.data);
  }
  return out;
}

export async function getTrending(limit = 30): Promise<CoinInfo[]> {
  const listed = await listings();
  const addresses = [...listed.keys()].slice(0, limit);
  const pairs = await pairsFor(addresses);
  return addresses.map((a) => toCoin(a, pairs.get(a), listed.get(a))).filter((c): c is CoinInfo => c !== null);
}

export async function getCoin(address: string): Promise<CoinInfo | null> {
  const [pairs, listed] = await Promise.all([pairsFor([address]), listings().catch(() => new Map<string, z.infer<typeof Listing>>())]);
  return toCoin(address, pairs.get(address), listed.get(address));
}
