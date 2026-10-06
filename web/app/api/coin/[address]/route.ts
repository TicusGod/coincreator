import { getCoin } from "@/lib/dexscreener";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(_req: Request, ctx: RouteContext<"/api/coin/[address]">) {
  const { address } = await ctx.params;
  if (!BASE58.test(address)) return Response.json({ error: "Invalid token address." }, { status: 400 });
  try {
    const coin = await getCoin(address);
    if (!coin) return Response.json({ error: "Coin not found on DexScreener." }, { status: 404 });
    return Response.json({ coin }, { headers: { "Cache-Control": "s-maxage=60" } });
  } catch {
    return Response.json({ error: "DexScreener is unavailable right now." }, { status: 502 });
  }
}
