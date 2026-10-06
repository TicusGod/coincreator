// Route handlers called directly (no server). Hits the live DexScreener API read-only; never pins to IPFS.
import { describe, expect, it } from "vitest";
import { GET as trending } from "@/app/api/trending/route";
import { POST as upload } from "@/app/api/upload/route";
import { POST as rpc } from "@/app/api/rpc/route";
import { sniffImage } from "@/lib/server/ipfs";
import { age, usd } from "@/lib/format";
import type { CoinInfo } from "@/lib/dexscreener";

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.append(k, v);
  return new Request("http://app.test/api/upload", { method: "POST", body: f, headers: { host: "app.test" } });
};

describe("copy trending", () => {
  let coins: CoinInfo[] = [];
  it("lists Solana coins with name, symbol, market cap and pair age", async () => {
    const r = await trending();
    coins = ((await r.json()) as { coins: CoinInfo[] }).coins;
    expect(coins.length).toBeGreaterThan(5);
    for (const c of coins) {
      expect(c.address).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
      expect(c.name.length).toBeGreaterThan(0);
      expect(c.symbol.length).toBeGreaterThan(0);
    }
    expect(coins.some((c) => c.imageUrl && c.marketCap && c.pairCreatedAt)).toBe(true);
  });

  it("copies the DexScreener image (fails only at the IPFS step when Pinata is not configured)", async () => {
    delete process.env.PINATA_JWT;
    const c = coins.find((x) => x.imageUrl)!;
    const r = await upload(form({ name: c.name.slice(0, 32), symbol: c.symbol.slice(0, 10), imageUrl: c.imageUrl! }));
    expect(r.status).toBe(503);
  });
});

describe("upload validation", () => {
  it("refuses images from other hosts (SSRF guard)", async () => {
    const r = await upload(form({ name: "A", symbol: "B", imageUrl: "https://169.254.169.254/latest" }));
    expect(r.status).toBe(400);
  });
  it("refuses a missing name", async () => {
    expect((await upload(form({ name: "", symbol: "B" }))).status).toBe(400);
  });
  it("refuses cross-origin posts", async () => {
    const req = new Request("http://app.test/api/upload", { method: "POST", body: new FormData(), headers: { host: "app.test", origin: "https://evil.test" } });
    expect((await upload(req)).status).toBe(403);
  });
  it("sniffs image types from bytes", () => {
    expect(sniffImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe("image/png");
    expect(sniffImage(new Uint8Array([0x3c, 0x73, 0x76, 0x67]))).toBeNull(); // <svg
  });
});

describe("rpc proxy", () => {
  it("blocks methods the app does not use", async () => {
    const r = await rpc(new Request("http://app.test/api/rpc", { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "requestAirdrop", params: [] }) }));
    expect(r.status).toBe(403);
  });
});

describe("format", () => {
  it("matches the card style", () => {
    expect(usd(7000)).toBe("$7.0K");
    expect(usd(816_200)).toBe("$816.2K");
    expect(age(Date.now() - 20 * 3600_000)).toBe("20h ago");
  });
});
