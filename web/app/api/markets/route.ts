// GET /api/markets?ids=<mint>,<mint>… (max 30) → live price / market cap / liquidity / 24h volume from DexScreener.
import { getMarkets } from "@/lib/dexscreener";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").filter((s) => BASE58.test(s));
  if (!ids.length || ids.length > 30) return Response.json({ error: "Pass 1 to 30 token addresses in ids." }, { status: 400 });
  try {
    return Response.json({ markets: await getMarkets(ids) }, { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=60" } });
  } catch {
    return Response.json({ error: "Market data is unavailable right now." }, { status: 502 });
  }
}
