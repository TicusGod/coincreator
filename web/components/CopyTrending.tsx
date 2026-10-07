"use client";

// Copy Trending, copied from the owner's coincreate reference: 2-column cards, 1-click copy that mints right away.
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Zap } from "lucide-react";
import { useConnection } from "@solana/wallet-adapter-react";
import type { CoinInfo } from "@/lib/dexscreener";
import { useAppWallet } from "@/lib/client/wallet";
import { launchCoin } from "@/lib/client/launch";
import { friendlyError } from "@/lib/client/send";
import { MAX_NAME, MAX_SYMBOL } from "@/lib/chain/metaplex";
import { FEES, lamportsToSol } from "@/lib/config";
import { LaunchSuccessModal } from "@/components/LaunchSuccessModal";
import { toast } from "@/components/Toaster";
import { TelegramLogo, XLogo } from "@/components/icons";

/** What a 1-click copy mints (as coincreate.cc): same name, ticker, picture and socials; 1B supply, 6 decimals,
 *  freeze + mint + update all revoked, for one flat fee. */
const COPY_OPTIONS = { revokeFreeze: true, revokeMint: true, revokeUpdate: true };
const COPY_FEE = lamportsToSol(FEES.copyTrending);

function formatMarketCap(n: number | null): string {
  if (n === null) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function formatAgo(ts: number | null, now: number): string {
  if (!ts || !now) return "—";
  const sec = Math.max(0, Math.floor((now - ts) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Social({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className="text-[#696e77] transition-opacity duration-150 hover:opacity-60">
      {children}
    </a>
  );
}

function TokenCard({ c, now, copying, onCopy }: { c: CoinInfo; now: number; copying: boolean; onCopy: () => void }) {
  return (
    <div className="flex flex-col gap-4 rounded-[16px] border border-[#212225] bg-[#18191b] p-5 transition-all duration-150 hover:border-[#272a2d]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {c.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.imageUrl} alt={c.name} className="h-12 w-12 shrink-0 rounded-full border border-[#212225] object-cover" loading="lazy" />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#212225] bg-[#212225] text-sm font-bold text-[#86efac]">
              {c.symbol.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-[#fafafa]">{c.name}</p>
            <p className="mt-1 truncate text-xs text-[#b0b4ba]">${c.symbol}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="mb-1 text-xs text-[#696e77]">Market Cap</p>
          <p className="text-sm font-semibold text-[#86efac]">{formatMarketCap(c.marketCap)}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-[#fb923c]">
        <span className="flex h-3 w-3 items-center justify-center rounded-full border border-[#fb923c] text-[7px] font-bold leading-none">!</span>
        <span>Pair age: {formatAgo(c.pairCreatedAt, now)}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Social href={c.dexUrl} label="DexScreener">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/dexscreener.png" alt="" className="h-4 w-4 object-contain" />
          </Social>
          {c.twitter && (
            <Social href={c.twitter} label="X">
              <XLogo size={16} />
            </Social>
          )}
          {c.telegram && (
            <Social href={c.telegram} label="Telegram">
              <TelegramLogo size={16} />
            </Social>
          )}
        </div>
        <button
          onClick={onCopy}
          disabled={copying}
          title={`Mints your copy now · ${COPY_FEE} SOL`}
          className="inline-flex h-9 select-none items-center gap-1.5 rounded-[10px] bg-[#86efac] px-4 text-xs font-semibold text-[#052e16] transition-all duration-150 hover:bg-[#bbf7d0] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
        >
          {copying ? (
            <>
              <RefreshCw size={12} className="animate-spin" /> Copying…
            </>
          ) : (
            <>
              <Zap size={12} fill="#052e16" /> Copy Coin
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function CopyTrending() {
  const { connection } = useConnection();
  const wallet = useAppWallet();
  const [coins, setCoins] = useState<CoinInfo[] | null>(null);
  const [now, setNow] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [copying, setCopying] = useState<string | null>(null);
  const [mint, setMint] = useState<string | null>(null);

  const apply = useCallback((d: { coins?: CoinInfo[]; error?: string }) => {
    setCoins(d.coins ?? []);
    setNow(Date.now());
    if (!d.coins) toast.error(d.error ?? "Trending coins are unavailable right now.");
  }, []);

  useEffect(() => {
    let alive = true;
    fetch("/api/trending")
      .then((r) => r.json())
      .then((d) => alive && apply(d))
      .catch(() => alive && apply({}));
    return () => {
      alive = false;
    };
  }, [apply]);

  async function refresh() {
    setRefreshing(true);
    try {
      apply(await (await fetch("/api/trending", { cache: "no-store" })).json());
    } catch {
      apply({});
    } finally {
      setRefreshing(false);
    }
  }

  async function copy(c: CoinInfo) {
    if (!wallet.publicKey) {
      wallet.connect();
      toast("Connect your wallet to copy");
      return;
    }
    setCopying(c.address);
    const t = toast.loading("Copying trending token…");
    try {
      const res = await launchCoin(wallet, connection, {
        name: c.name.slice(0, MAX_NAME),
        symbol: c.symbol.replace(/^\$/, "").slice(0, MAX_SYMBOL),
        description: c.description,
        decimals: 6,
        supply: BigInt(1_000_000_000),
        imageUrl: c.imageUrl,
        links: { website: c.website ?? undefined, twitter: c.twitter ?? undefined, telegram: c.telegram ?? undefined },
        options: COPY_OPTIONS,
        flatFee: FEES.copyTrending,
      });
      toast.success("Token created", { id: t });
      setMint(res.mint);
    } catch (e) {
      toast.error(friendlyError(e), { id: t });
    } finally {
      setCopying(null);
    }
  }

  return (
    <>
      {mint && <LaunchSuccessModal mint={mint} onClose={() => setMint(null)} />}
      <section className="min-h-screen bg-[#111113] px-4 pb-20 pt-12 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="mb-8 text-center text-3xl font-bold tracking-tight text-[#fafafa]">Copy Trending Coins in 1 Click</h1>
          <div className="mb-6 flex items-center justify-between gap-4">
            <p className="text-xs text-[#696e77]">Same name, ticker, image and socials · 1B supply · freeze, mint &amp; update revoked · {COPY_FEE} SOL</p>
            <button
              onClick={refresh}
              aria-label="Refresh"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#212225] transition-all duration-150 hover:bg-[#272a2d] active:translate-y-px"
            >
              <RefreshCw size={15} className={`text-[#b0b4ba] ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {coins === null && Array.from({ length: 6 }, (_, i) => <div key={i} className="h-48 animate-pulse rounded-[16px] border border-[#212225] bg-[#18191b]" />)}
            {coins?.map((c) => (
              <TokenCard key={c.address} c={c} now={now} copying={copying === c.address} onCopy={() => copy(c)} />
            ))}
          </div>
          {coins?.length === 0 && <p className="py-16 text-center text-sm text-[#696e77]">No trending coins right now. Try refreshing.</p>}
        </div>
      </section>
    </>
  );
}
