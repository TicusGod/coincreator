"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { CoinInfo } from "@/lib/dexscreener";
import { age, usd } from "@/lib/format";
import { Notice } from "@/components/ui";

const Icon = {
  dex: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 3 6v6c0 5 3.8 9.4 9 10 5.2-.6 9-5 9-10V6zm-3 9h2v5H9zm4-3h2v8h-2z" /></svg>,
  x: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>,
  tg: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20m4.6 6.8-1.6 7.6c-.1.5-.4.7-.9.4l-2.5-1.8-1.2 1.1c-.1.1-.3.3-.6.3l.2-2.6 4.7-4.3c.2-.2 0-.3-.3-.1L8.6 13l-2.5-.8c-.5-.2-.5-.5.1-.8l9.8-3.8c.4-.1.8.1.6 1.2" /></svg>,
  web: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" /></svg>,
};

function CoinCard({ c }: { c: CoinInfo }) {
  const links = [
    { href: c.dexUrl, icon: Icon.dex, label: "DexScreener" },
    c.website && { href: c.website, icon: Icon.web, label: "Website" },
    c.twitter && { href: c.twitter, icon: Icon.x, label: "X" },
    c.telegram && { href: c.telegram, icon: Icon.tg, label: "Telegram" },
  ].filter(Boolean) as { href: string; icon: React.ReactNode; label: string }[];

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {c.imageUrl && <img src={c.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{c.name}</div>
          <div className="truncate text-sm text-muted">${c.symbol}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">Market Cap</div>
          <div className="font-semibold text-accent">{usd(c.marketCap)}</div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1.5 text-sm text-warn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" /></svg>
        Pair age: {age(c.pairCreatedAt)}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-zinc-500">
          {links.map((l) => (
            <a key={l.label} href={l.href} target="_blank" rel="noreferrer" aria-label={l.label} className="transition hover:text-white">
              {l.icon}
            </a>
          ))}
        </div>
        <Link
          href={`/?copy=${c.address}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-bg transition hover:brightness-110"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
          Copy Coin
        </Link>
      </div>
    </div>
  );
}

export function CopyTrending() {
  const [coins, setCoins] = useState<CoinInfo[] | null>(null);
  const [error, setError] = useState("");
  const [spinning, setSpinning] = useState(false);

  const load = useCallback(async () => {
    setSpinning(true);
    try {
      const r = await fetch("/api/trending", { cache: "no-store" });
      const d = (await r.json()) as { coins?: CoinInfo[]; error?: string };
      if (!d.coins) throw new Error(d.error);
      setCoins(d.coins);
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
        if (!d.coins) setError(d.error ?? "Trending coins are unavailable right now.");
      })
      .catch(() => alive && (setCoins([]), setError("Trending coins are unavailable right now.")));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={load} aria-label="Refresh" className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-card text-zinc-300 hover:text-white">
          <svg className={spinning ? "animate-spin" : ""} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4" />
          </svg>
        </button>
      </div>
      {error && <div className="mb-4"><Notice tone="error">{error}</Notice></div>}
      <div className="grid gap-4 md:grid-cols-2">
        {coins === null &&
          Array.from({ length: 6 }, (_, i) => <div key={i} className="h-[178px] animate-pulse rounded-2xl border border-line bg-card" />)}
        {coins?.map((c) => <CoinCard key={c.address} c={c} />)}
      </div>
    </div>
  );
}
