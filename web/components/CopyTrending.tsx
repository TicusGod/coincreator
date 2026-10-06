"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CoinInfo } from "@/lib/dexscreener";
import { age, usd } from "@/lib/format";
import { Notice, Segmented, TokenAvatar } from "@/components/ui";
import { Card3D } from "@/components/Card3D";

const Icon = {
  dex: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 3 6v6c0 5 3.8 9.4 9 10 5.2-.6 9-5 9-10V6zm-3 9h2v5H9zm4-3h2v8h-2z" /></svg>,
  x: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
  tg: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m4.6 6.8-1.6 7.6c-.1.5-.4.7-.9.4l-2.5-1.8-1.2 1.1c-.1.1-.3.3-.6.3l.2-2.6 4.7-4.3c.2-.2 0-.3-.3-.1L8.6 13l-2.5-.8c-.5-.2-.5-.5.1-.8l9.8-3.8c.4-.1.8.1.6 1.2" /></svg>,
  web: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" /></svg>,
};

type Sort = "trending" | "mcap" | "new";

function CoinCard({ c, rank, now }: { c: CoinInfo; rank: number; now: number }) {
  const links = [
    { href: c.dexUrl, icon: Icon.dex, label: "DexScreener" },
    c.website && { href: c.website, icon: Icon.web, label: "Website" },
    c.twitter && { href: c.twitter, icon: Icon.x, label: "X" },
    c.telegram && { href: c.telegram, icon: Icon.tg, label: "Telegram" },
  ].filter(Boolean) as { href: string; icon: React.ReactNode; label: string }[];
  const fresh = c.pairCreatedAt && now - c.pairCreatedAt < 6 * 3600_000;

  return (
    <Card3D tilt={6} className="group p-5">
      <span className="absolute right-4 top-4 font-mono text-[11px] text-dim">#{rank}</span>
      <div className="flex items-center gap-3.5 pr-8">
        <TokenAvatar src={c.imageUrl} label={c.symbol} size={52} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[17px] font-bold">{c.name}</div>
          <div className="truncate text-sm text-muted">${c.symbol}</div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="field rounded-xl px-3 py-2">
          <div className="text-[11px] text-dim">Market Cap</div>
          <div className="font-display text-base font-bold text-good">{usd(c.marketCap)}</div>
        </div>
        <div className="field rounded-xl px-3 py-2">
          <div className="text-[11px] text-dim">Pair age</div>
          <div className={`flex items-center gap-1.5 font-display text-base font-bold ${fresh ? "text-sun" : "text-text"}`}>
            {fresh && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sun" />}
            {age(c.pairCreatedAt, now)}
          </div>
        </div>
      </div>
      {c.description && <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-muted">{c.description}</p>}
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              aria-label={l.label}
              className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface-2/60 text-muted transition hover:border-line-hi hover:text-text"
            >
              {l.icon}
            </a>
          ))}
        </div>
        <Link href={`/?copy=${c.address}`} className="btn-brand inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold transition active:scale-[.98]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
          Copy Coin
        </Link>
      </div>
    </Card3D>
  );
}

export function CopyTrending() {
  const [coins, setCoins] = useState<CoinInfo[] | null>(null);
  const [error, setError] = useState("");
  const [spinning, setSpinning] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("trending");
  const [now, setNow] = useState(0);

  const load = useCallback(async () => {
    setSpinning(true);
    try {
      const r = await fetch("/api/trending", { cache: "no-store" });
      const d = (await r.json()) as { coins?: CoinInfo[]; error?: string };
      if (!d.coins) throw new Error(d.error);
      setCoins(d.coins);
      setNow(Date.now());
      setError("");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Trending coins are unavailable right now.");
      setCoins((c) => c ?? []);
    } finally {
      setSpinning(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/trending")
      .then((r) => r.json())
      .then((d: { coins?: CoinInfo[]; error?: string }) => {
        if (!alive) return;
        setCoins(d.coins ?? []);
        setNow(Date.now());
        if (!d.coins) setError(d.error ?? "Trending coins are unavailable right now.");
      })
      .catch(() => alive && (setCoins([]), setError("Trending coins are unavailable right now.")));
    return () => {
      alive = false;
    };
  }, []);

  const shown = useMemo(() => {
    if (!coins) return null;
    const needle = q.trim().toLowerCase();
    const list = coins.map((c, i) => ({ c, rank: i + 1 })).filter(({ c }) => !needle || c.name.toLowerCase().includes(needle) || c.symbol.toLowerCase().includes(needle) || c.address === q.trim());
    if (sort === "mcap") list.sort((a, b) => (b.c.marketCap ?? 0) - (a.c.marketCap ?? 0));
    if (sort === "new") list.sort((a, b) => (b.c.pairCreatedAt ?? 0) - (a.c.pairCreatedAt ?? 0));
    return list;
  }, [coins, q, sort]);

  return (
    <div className="rise">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, ticker or address"
            className="field h-11 w-full rounded-xl pl-10 pr-3 text-sm outline-none transition placeholder:text-dim focus:border-ember/60"
          />
        </div>
        <div className="flex gap-2">
          <div className="w-full sm:w-[300px]">
            <Segmented value={sort} onChange={setSort} options={[{ value: "trending", label: "Trending" }, { value: "mcap", label: "Market cap" }, { value: "new", label: "Newest" }]} />
          </div>
          <button onClick={load} aria-label="Refresh" className="grid h-11 w-11 shrink-0 place-items-center self-center rounded-xl border border-line bg-surface/70 text-muted transition hover:border-line-hi hover:text-text">
            <svg className={spinning ? "animate-spin" : ""} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4" />
            </svg>
          </button>
        </div>
      </div>
      {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}
      <div className="grid gap-4 md:grid-cols-2">
        {shown === null && Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-[248px] rounded-[20px]" />)}
        {shown?.map(({ c, rank }) => <CoinCard key={c.address} c={c} rank={rank} now={now} />)}
      </div>
      {shown?.length === 0 && !error && <p className="py-16 text-center text-sm text-muted">No coin matches “{q}”.</p>}
    </div>
  );
}
