"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CoinInfo } from "@/lib/dexscreener";
import { age, usd } from "@/lib/format";
import { Notice, Segmented, TokenAvatar } from "@/components/ui";
import { Card3D } from "@/components/Card3D";
import { ChartCandlestick, Globe } from "lucide-react";
import { TelegramLogo, XLogo } from "@/components/icons";

const LINK_STYLE = {
  dex: "hover:text-[#4ade80] hover:border-[#4ade80]/40",
  web: "hover:text-sun hover:border-sun/40",
  x: "hover:text-white hover:border-white/30",
  tg: "hover:text-[#2aabee] hover:border-[#2aabee]/40",
} as const;

type Sort = "trending" | "mcap" | "new";

function CoinCard({ c, rank, now }: { c: CoinInfo; rank: number; now: number }) {
  const links = [
    { href: c.dexUrl, icon: <ChartCandlestick size={16} strokeWidth={1.9} />, label: "DexScreener", style: LINK_STYLE.dex },
    c.website && { href: c.website, icon: <Globe size={16} strokeWidth={1.9} />, label: "Website", style: LINK_STYLE.web },
    c.twitter && { href: c.twitter, icon: <XLogo size={14} />, label: "X", style: LINK_STYLE.x },
    c.telegram && { href: c.telegram, icon: <TelegramLogo size={16} />, label: "Telegram", style: LINK_STYLE.tg },
  ].filter(Boolean) as { href: string; icon: React.ReactNode; label: string; style: string }[];
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
              title={l.label}
              className={`grid h-9 w-9 place-items-center rounded-xl border border-white/[.07] bg-gradient-to-b from-white/[.06] to-white/[.01] text-muted shadow-[inset_0_1px_0_rgba(255,255,255,.06)] transition hover:-translate-y-0.5 ${l.style}`}
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
