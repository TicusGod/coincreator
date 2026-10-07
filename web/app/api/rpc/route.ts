// JSON-RPC pass-through so the keyed RPC URL never reaches the browser. Only the methods the app uses.
import { clientIp, rateLimited } from "@/lib/server/rate-limit";

const ALLOWED = new Set([
  "getAccountInfo", "getMultipleAccounts", "getBalance", "getLatestBlockhash", "getMinimumBalanceForRentExemption",
  "getTokenAccountsByOwner", "getProgramAccounts", "sendTransaction", "simulateTransaction", "getSignatureStatuses",
  "getSlot", "getBlockTime", "getBlockHeight", "getEpochInfo", "getFeeForMessage", "isBlockhashValid", "getTokenAccountBalance",
]);
const MAX_BODY = 64 * 1024;

export async function POST(req: Request) {
  const upstream = process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
  if (rateLimited(`rpc:${clientIp(req)}`, 300)) return Response.json({ error: "rate limited" }, { status: 429 });
  const text = await req.text();
  if (text.length > MAX_BODY) return Response.json({ error: "body too large" }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const calls = Array.isArray(body) ? body : [body];
  if (calls.length > 20 || !calls.every((c) => c && typeof c === "object" && ALLOWED.has((c as { method?: string }).method ?? "")))
    return Response.json({ error: "method not allowed" }, { status: 403 });

  try {
    const res = await fetch(upstream, { method: "POST", headers: { "content-type": "application/json" }, body: text, signal: AbortSignal.timeout(25_000) });
    return new Response(await res.text(), { status: res.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  } catch {
    // Upstream slow or down: answer like a node would so the client shows a clean error instead of crashing.
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "RPC is busy, please try again." } }, { status: 504 });
  }
}
