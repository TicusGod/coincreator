export function usd(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export function age(ts: number | null, now = Date.now()): string {
  if (!ts) return "—";
  const m = Math.max(0, Math.floor((now - ts) / 60_000));
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 72 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
}
