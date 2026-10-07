"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { ChartCandlestick, Check, Copy, Droplets, ExternalLink, Lock, RefreshCw, ShieldCheck, ShieldAlert, Sparkles } from "lucide-react";
import { findMyCoins, type MyCoin } from "@/lib/chain/coins";
import { buildClaimFeesTx, type UserPosition } from "@/lib/chain/meteora";
import { useAppWallet } from "@/lib/client/wallet";
import { friendlyError, sendAndConfirm, solscanToken, solscanTx } from "@/lib/client/send";
import { metadataImage } from "@/lib/client/token-image";
import type { Market } from "@/lib/dexscreener";
import { usd } from "@/lib/format";
import { Card3D } from "@/components/Card3D";
import { Button, Card, Notice, SolLogo, TokenAvatar } from "@/components/ui";

const compact = (n: number) => n.toLocaleString("en-US", { notation: n >= 1e6 ? "compact" : "standard", maximumFractionDigits: 2 });
const price = (n: number | null) => (n === null ? "—" : n >= 0.01 ? `$${n.toFixed(4)}` : `$${n.toPrecision(3)}`);

function CopyCA({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <div className="field flex items-center gap-2 rounded-xl py-1.5 pl-3 pr-1.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-dim">CA</span>
      <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-text">{value}</span>
      <button
        onClick={() => navigator.clipboard?.writeText(value).then(() => { setDone(true); setTimeout(() => setDone(false), 1200); })}
        aria-label="Copy contract address"
        className={`grid h-8 w-8 place-items-center rounded-lg transition ${done ? "bg-good/15 text-good" : "bg-white/[.05] text-muted hover:text-text"}`}
      >
        {done ? <Check size={15} /> : <Copy size={15} />}
      </button>
    </div>
  );
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${ok ? "bg-good/10 text-good" : "bg-sun/10 text-sun"}`}>
      {ok ? <ShieldCheck size={11} /> : <ShieldAlert size={11} />}
      {label}
    </span>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "up" | "down" }) {
  return (
    <div className="field rounded-xl px-3 py-2.5">
      <div className="text-[11px] text-dim">{label}</div>
      <div className="mt-0.5 truncate font-display text-[15px] font-bold">{value}</div>
      {sub && <div className={`text-[11px] font-semibold ${tone === "up" ? "text-good" : tone === "down" ? "text-red-400" : "text-dim"}`}>{sub}</div>}
    </div>
  );
}

function PositionRow({ p, onClaim, busy }: { p: UserPosition; onClaim: () => void; busy: boolean }) {
  return (
    <div className="rounded-2xl border border-white/[.06] bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-2 font-semibold text-muted">
          <Droplets size={14} className="text-ember" /> Meteora pool
          <a href={`https://solscan.io/account/${p.pool.toBase58()}`} target="_blank" rel="noreferrer" className="font-mono text-dim hover:text-muted">
            {p.pool.toBase58().slice(0, 4)}…{p.pool.toBase58().slice(-4)}
          </a>
        </span>
        {p.locked ? (
          <span className="flex items-center gap-1 font-bold uppercase tracking-wide text-sun"><Lock size={12} /> Locked forever</span>
        ) : (
          <Link href="/liquidity?tab=remove" className="font-semibold text-muted hover:text-text">Remove liquidity →</Link>
        )}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[11px] text-dim">Your liquidity</div>
            <div className="mt-0.5 flex items-center gap-1.5 font-mono text-sm"><SolLogo size={16} /> {p.outSol} SOL</div>
            <div className="font-mono text-xs text-muted">+ {p.outToken} {p.symbol}</div>
          </div>
          <div>
            <div className="text-[11px] text-dim">Unclaimed fees</div>
            <div className={`mt-0.5 font-display text-lg font-extrabold ${p.hasFees ? "text-brand" : "text-dim"}`}>{p.feeSol} SOL</div>
            {p.feeToken !== "0" && <div className="font-mono text-xs text-muted">+ {p.feeToken} {p.symbol}</div>}
          </div>
        </div>
        <Button onClick={onClaim} loading={busy} disabled={!p.hasFees || busy} className="w-full sm:w-auto">
          <Sparkles size={15} /> Claim fees
        </Button>
      </div>
    </div>
  );
}

function CoinCard({ c, market, onClaim, claiming }: { c: MyCoin; market?: Market; onClaim: (p: UserPosition) => void; claiming: string | null }) {
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    metadataImage(c.uri).then((i) => alive && setImg(i));
    return () => {
      alive = false;
    };
  }, [c.uri]);
  const ca = c.mint.toBase58();
  const held = c.supply ? (c.balance / c.supply) * 100 : 0;
  const ch = market?.change24h ?? null;

  return (
    <Card3D className="p-5 sm:p-6">
      <div className="flex items-start gap-3.5">
        <TokenAvatar src={img ?? market?.imageUrl} label={c.symbol} size={56} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="truncate font-display text-xl font-extrabold">{c.name}</span>
            <span className="text-sm text-muted">${c.symbol}</span>
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <Badge ok={c.mintRevoked} label={c.mintRevoked ? "Mint revoked" : "Mint active"} />
            <Badge ok={c.freezeRevoked} label={c.freezeRevoked ? "Freeze revoked" : "Freeze active"} />
            {c.immutable && <Badge ok label="Immutable" />}
          </div>
        </div>
        <div className="hidden text-right sm:block">
          <div className="text-[11px] text-dim">Market Cap</div>
          <div className="font-display text-xl font-extrabold text-good">{usd(market?.marketCap ?? null)}</div>
        </div>
      </div>

      <div className="mt-4"><CopyCA value={ca} /></div>

      {market ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Market cap" value={usd(market.marketCap)} />
          <Stat label="Price" value={price(market.priceUsd)} sub={ch === null ? undefined : `${ch >= 0 ? "+" : ""}${ch.toFixed(1)}% 24h`} tone={ch === null ? undefined : ch >= 0 ? "up" : "down"} />
          <Stat label="Liquidity" value={usd(market.liquidityUsd)} />
          <Stat label="Volume 24h" value={usd(market.volume24h)} />
        </div>
      ) : (
        <div className="mt-3 flex flex-col items-start justify-between gap-3 rounded-2xl border border-dashed border-white/[.08] p-4 sm:flex-row sm:items-center">
          <div>
            <div className="font-display text-sm font-bold">Not trading yet</div>
            <div className="text-xs text-muted">Add liquidity on Meteora so people can buy it. Market data appears a few minutes after.</div>
          </div>
          {!c.positions.length && (
            <Link href={`/liquidity?mint=${ca}`}><Button><Droplets size={15} /> Create Liquidity</Button></Link>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Total supply" value={compact(c.supply)} />
        <Stat label="In your wallet" value={compact(c.balance)} sub={`${held.toFixed(held < 1 ? 2 : 1)}% of supply`} />
        <Stat label="Decimals" value={String(c.decimals)} />
      </div>

      {c.positions.length > 0 && (
        <div className="mt-4 grid gap-2">
          {c.positions.map((p) => (
            <PositionRow key={p.position.toBase58()} p={p} onClaim={() => onClaim(p)} busy={claiming === p.position.toBase58()} />
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/[.06] pt-4">
        <a href={market?.dexUrl ?? `https://dexscreener.com/solana/${ca}`} target="_blank" rel="noreferrer" className="field inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-muted hover:text-text">
          <ChartCandlestick size={14} /> DexScreener
        </a>
        <a href={solscanToken(ca)} target="_blank" rel="noreferrer" className="field inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-muted hover:text-text">
          <ExternalLink size={14} /> Solscan
        </a>
        {c.positions.length > 0 && (
          <Link href={`/liquidity?mint=${ca}`} className="field inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-muted hover:text-text">
            <Droplets size={14} /> New pool
          </Link>
        )}
        {!c.mintRevoked && (
          <Link href="/my-coins#manage" className="field inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-sun hover:text-text">
            <ShieldAlert size={14} /> Revoke mint
          </Link>
        )}
      </div>
    </Card3D>
  );
}

export function MyCoins() {
  const { connection } = useConnection();
  const wallet = useAppWallet();
  const [coins, setCoins] = useState<MyCoin[] | null>(null);
  const [markets, setMarkets] = useState<Record<string, Market>>({});
  const [claiming, setClaiming] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string; sig?: string } | null>(null);
  const [spinning, setSpinning] = useState(false);

  const load = useCallback(async () => {
    if (!wallet.publicKey) return;
    setSpinning(true);
    try {
      const list = await findMyCoins(connection, wallet.publicKey);
      setCoins(list);
      if (list.length) {
        const r = await fetch(`/api/markets?ids=${list.slice(0, 30).map((c) => c.mint.toBase58()).join(",")}`);
        const d = (await r.json()) as { markets?: Market[] };
        setMarkets(Object.fromEntries((d.markets ?? []).map((m) => [m.address, m])));
      }
    } catch (e) {
      setCoins((c) => c ?? []);
      setMsg({ tone: "error", text: friendlyError(e) });
    } finally {
      setSpinning(false);
    }
  }, [connection, wallet.publicKey]);

  useEffect(() => {
    if (!wallet.publicKey) return;
    let alive = true;
    (async () => {
      const list = await findMyCoins(connection, wallet.publicKey!);
      if (!alive) return;
      setCoins(list);
      if (!list.length) return;
      const r = await fetch(`/api/markets?ids=${list.slice(0, 30).map((c) => c.mint.toBase58()).join(",")}`);
      const d = (await r.json()) as { markets?: Market[] };
      if (alive) setMarkets(Object.fromEntries((d.markets ?? []).map((m) => [m.address, m])));
    })().catch((e) => {
      if (!alive) return;
      setCoins([]);
      setMsg({ tone: "error", text: friendlyError(e) });
    });
    return () => {
      alive = false;
    };
  }, [connection, wallet.publicKey]);

  async function claim(p: UserPosition) {
    if (!wallet.publicKey) return;
    setClaiming(p.position.toBase58());
    setMsg(null);
    try {
      const sig = await sendAndConfirm(wallet, connection, await buildClaimFeesTx(connection, wallet.publicKey, p));
      setMsg({ tone: "success", text: `${p.feeSol} SOL of fees claimed to your wallet.`, sig });
      await load();
    } catch (e) {
      setMsg({ tone: "error", text: friendlyError(e) });
    } finally {
      setClaiming(null);
    }
  }

  if (!wallet.publicKey) {
    return (
      <Card highlight className="rise py-10 text-center">
        <h2 className="font-display text-lg font-bold">Connect your wallet</h2>
        <p className="mt-1.5 text-sm text-muted">Use the wallet you created your coins with.</p>
        <Button className="mt-6" onClick={wallet.connect}>Select Wallet</Button>
      </Card>
    );
  }

  const totalFees = (coins ?? []).flatMap((c) => c.positions).reduce((s, p) => s + Number(p.feeSol), 0);
  const totalMcap = (coins ?? []).reduce((s, c) => s + (markets[c.mint.toBase58()]?.marketCap ?? 0), 0);

  return (
    <div className="rise grid gap-4">
      <div className="grid grid-cols-3 gap-2">
        <div className="card-3d-soft px-4 py-3">
          <div className="text-[11px] text-dim">Coins</div>
          <div className="font-display text-xl font-extrabold">{coins?.length ?? "—"}</div>
        </div>
        <div className="card-3d-soft px-4 py-3">
          <div className="text-[11px] text-dim">Total market cap</div>
          <div className="font-display text-xl font-extrabold text-good">{usd(totalMcap || null)}</div>
        </div>
        <div className="card-3d-soft flex items-center justify-between gap-2 px-4 py-3">
          <div className="min-w-0">
            <div className="text-[11px] text-dim">Unclaimed fees</div>
            <div className="truncate font-display text-xl font-extrabold text-brand">{totalFees.toFixed(4)} SOL</div>
          </div>
          <button onClick={load} aria-label="Refresh" className="field grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted hover:text-text">
            <RefreshCw size={15} className={spinning ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {msg && (
        <Notice tone={msg.tone}>
          {msg.text} {msg.sig && <a className="underline" href={solscanTx(msg.sig)} target="_blank" rel="noreferrer">View transaction</a>}
        </Notice>
      )}

      {coins === null && [0, 1].map((i) => <div key={i} className="skeleton h-[320px] rounded-[26px]" />)}
      {coins?.length === 0 && (
        <Card className="py-12 text-center">
          <p className="font-display text-lg font-bold">No coins yet</p>
          <p className="mt-1.5 text-sm text-muted">Coins you create with this wallet show up here.</p>
          <Link href="/"><Button className="mt-5">Create your first coin</Button></Link>
        </Card>
      )}
      {coins?.map((c) => (
        <CoinCard key={c.mint.toBase58()} c={c} market={markets[c.mint.toBase58()]} onClaim={claim} claiming={claiming} />
      ))}
    </div>
  );
}
