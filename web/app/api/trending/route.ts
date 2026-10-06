import { getTrending } from "@/lib/dexscreener";

export const revalidate = 60;

export async function GET() {
  try {
    return Response.json({ coins: await getTrending() }, { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" } });
  } catch {
    return Response.json({ error: "Trending coins are unavailable right now. Try again in a minute." }, { status: 502 });
  }
}
