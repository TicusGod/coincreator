// Coin picture + metadata JSON on IPFS through Pinata (JWT). The image type is sniffed from bytes, never trusted.
const PIN_FILE = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PIN_JSON = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
// ipfs.io stopped serving files directly (2026); use the account's dedicated Pinata gateway via IPFS_GATEWAY.
const GATEWAY = process.env.IPFS_GATEWAY || "https://gateway.pinata.cloud/ipfs/";

export type ImageType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

export function sniffImage(b: Uint8Array): ImageType | null {
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return "image/webp";
  return null;
}

export interface CoinMeta {
  name: string;
  symbol: string;
  description: string;
  website?: string;
  twitter?: string;
  telegram?: string;
}

async function pin(jwt: string, url: string, body: BodyInit, json: boolean): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { authorization: `Bearer ${jwt}`, ...(json ? { "content-type": "application/json" } : {}) },
    body,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`pinata ${res.status}`);
  const data = (await res.json()) as { IpfsHash?: string };
  if (!data.IpfsHash) throw new Error("pinata returned no hash");
  return data.IpfsHash;
}

export async function storeCoin(bytes: Uint8Array, type: ImageType, meta: CoinMeta): Promise<{ uri: string; image: string }> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("PINATA_JWT not set");
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(bytes)], { type }), `coin.${type.split("/")[1]}`);
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));
  const image = GATEWAY + (await pin(jwt, PIN_FILE, form, false));
  const socials = {
    ...(meta.website ? { website: meta.website } : {}),
    ...(meta.twitter ? { twitter: meta.twitter } : {}),
    ...(meta.telegram ? { telegram: meta.telegram } : {}),
  };
  const content = { name: meta.name, symbol: meta.symbol, description: meta.description, image, ...socials, extensions: socials };
  const cid = await pin(jwt, PIN_JSON, JSON.stringify({ pinataContent: content, pinataOptions: { cidVersion: 1 } }), true);
  return { uri: GATEWAY + cid, image };
}
