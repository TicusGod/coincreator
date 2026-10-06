// Image URL from a token's off-chain metadata JSON (cached per session).
const cache = new Map<string, Promise<string | null>>();

export function metadataImage(uri: string): Promise<string | null> {
  if (!/^https:\/\//.test(uri)) return Promise.resolve(null);
  if (!cache.has(uri)) {
    cache.set(
      uri,
      fetch(uri, { signal: AbortSignal.timeout(8000) })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: { image?: unknown } | null) => (typeof j?.image === "string" && /^https:\/\//.test(j.image) ? j.image : null))
        .catch(() => null),
    );
  }
  return cache.get(uri)!;
}
