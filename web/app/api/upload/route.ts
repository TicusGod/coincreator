// POST multipart: coin fields + either `file` (user picture) or `imageUrl` (DexScreener picture, for Copy Coin).
import { z } from "zod";
import { clientIp, rateLimited } from "@/lib/server/rate-limit";
import { sniffImage, storeCoin } from "@/lib/server/ipfs";

export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;
const IMAGE_HOSTS = new Set(["cdn.dexscreener.com", "dd.dexscreener.com"]);
const url = z.string().trim().max(200).url().refine((u) => u.startsWith("https://"), "Links must start with https://").optional().or(z.literal("").transform(() => undefined));

const Fields = z.object({
  name: z.string().trim().min(1, "Name is required").max(32),
  symbol: z.string().trim().min(1, "Symbol is required").max(10),
  description: z.string().trim().max(1000).default(""),
  website: url,
  twitter: url,
  telegram: url,
  discord: url,
  creatorName: z.string().trim().max(64).optional().or(z.literal("").transform(() => undefined)),
  creatorWebsite: url,
  imageUrl: z.string().url().optional(),
});

const fail = (error: string, status = 400) => Response.json({ error }, { status });

async function readImage(form: FormData, imageUrl?: string): Promise<Uint8Array | string> {
  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) return "Image must be 4 MB or smaller.";
    return new Uint8Array(await file.arrayBuffer());
  }
  if (!imageUrl) return "Add an image for your coin.";
  const u = new URL(imageUrl);
  if (u.protocol !== "https:" || !IMAGE_HOSTS.has(u.hostname)) return "This image source is not allowed.";
  const res = await fetch(u, { signal: AbortSignal.timeout(10_000), redirect: "error" });
  if (!res.ok) return "Could not copy the coin image.";
  const bytes = new Uint8Array(await res.arrayBuffer());
  return bytes.length > MAX_BYTES ? "Image must be 4 MB or smaller." : bytes;
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return fail("Invalid request origin.", 403);
  if (rateLimited(`upload:${clientIp(req)}`, 10)) return fail("Too many uploads. Wait a minute and try again.", 429);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail("Invalid form data.");
  }
  const parsed = Fields.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid fields.");

  const image = await readImage(form, parsed.data.imageUrl).catch(() => "Could not read the image.");
  if (typeof image === "string") return fail(image);
  const type = sniffImage(image);
  if (!type) return fail("Image must be PNG, JPG, GIF or WebP.");

  try {
    return Response.json(await storeCoin(image, type, parsed.data));
  } catch (e) {
    const notSet = e instanceof Error && e.message.includes("not set");
    return fail(notSet ? "Uploads are not configured yet." : "Upload failed. Please try again.", notSet ? 503 : 502);
  }
}
