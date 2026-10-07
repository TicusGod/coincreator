"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { useAppWallet } from "@/lib/client/wallet";
import { FEE_TIERS, buildCreatePoolTx, tokenLabels } from "@/lib/chain/meteora";
import { FEES, lamportsToSol } from "@/lib/config";
import { friendlyError, sendAndConfirm, solscanTx } from "@/lib/client/send";
import { metadataImage } from "@/lib/client/token-image";
import { Card3D } from "@/components/Card3D";
import { Button, ExternalLink, Field, Input, Notice, Row, Segmented, SolLogo, SuccessPanel, ToggleRow, TokenAvatar } from "@/components/ui";

const POOL_RENT_ESTIMATE_SOL = 0.03;
const SOL_RESERVE = 0.05; // keep for fees + rent when pressing Max on SOL

const parseKey = (s: string) => {
  try {
    return new PublicKey(s.trim());
  } catch {
    return null;
  }
};

interface TokenState {
  key: string;
  name: string;
  symbol: string;
  image: string | null;
  balance: string;
  supply: number;
  freeze: boolean;
}

const num = (s: string) => s.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1");
const fmt = (n: number, d = 4) => n.toLocaleString("en-US", { maximumFractionDigits: d });

function AmountRow({ label, value, onChange, token, balance, onMax, onHalf }: {
  label: string; value: string; onChange: (v: string) => void; token: React.ReactNode; balance?: string; onMax?: () => void; onHalf?: () => void;
}) {
  return (
    <div className="field rounded-2xl p-4 transition focus-within:border-ember/60 focus-within:shadow-[0_0_0_4px_rgba(245,75,0,.1)]">
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>{label}</span>
        {balance !== undefined && (
          <span className="flex items-center gap-2">
            <span>Balance: <span className="font-mono text-text">{balance}</span></span>
            {onHalf && <button type="button" onClick={onHalf} className="rounded-md bg-surface-2 px-1.5 py-0.5 font-semibold text-muted hover:text-text">HALF</button>}
            {onMax && <button type="button" onClick={onMax} className="rounded-md bg-ember/15 px-1.5 py-0.5 font-semibold text-ember hover:bg-ember/25">MAX</button>}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-line bg-surface-2 py-1.5 pl-1.5 pr-3">{token}</div>
        <input
          value={value}
          onChange={(e) => onChange(num(e.target.value))}
          inputMode="decimal"
          placeholder="0.00"
          size={1}
          className="w-full min-w-0 flex-1 bg-transparent text-right font-display text-2xl font-semibold outline-none placeholder:text-dim"
        />
      </div>
    </div>
  );
}

export function CreateLiquidityForm({ initialMint = "" }: { initialMint?: string }) {
  const { connection } = useConnection();
  const wallet = useAppWallet();

  const [mint, setMint] = useState(initialMint);
  const [tokenAmount, setTokenAmount] = useState("");
  const [solAmount, setSolAmount] = useState("");
  const [feeBps, setFeeBps] = useState<number>(100);
  const [lock, setLock] = useState(false);
  const [token, setToken] = useState<TokenState | null>(null);
  const [solBal, setSolBal] = useState<{ key: string; sol: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ pool: string; sig: string } | null>(null);

  const mintKey = parseKey(mint);
  const owner = wallet.publicKey?.toBase58() ?? "";
  const tokenKey = mintKey ? `${mintKey.toBase58()}:${owner}` : "";
  const info = token && token.key === tokenKey ? token : null;
  const sol = solBal && solBal.key === owner ? solBal.sol : null;

  // Token: metadata, picture, supply, wallet balance.
  useEffect(() => {
    if (!mintKey) return;
    let alive = true;
    (async () => {
      const [labels, parsed, accs] = await Promise.all([
        tokenLabels(connection, [mintKey]),
        connection.getParsedAccountInfo(mintKey),
        wallet.publicKey ? connection.getParsedTokenAccountsByOwner(wallet.publicKey, { mint: mintKey }) : null,
      ]);
      const m = parsed.value?.data && "parsed" in parsed.value.data ? parsed.value.data.parsed.info : null;
      if (!m) throw new Error("not a mint");
      const image = await metadataImage(labels[0].uri);
      if (!alive) return;
      setToken({
        key: tokenKey,
        ...labels[0],
        image,
        balance: accs?.value[0]?.account.data.parsed.info.tokenAmount.uiAmountString ?? "0",
        supply: Number(m.supply) / 10 ** m.decimals,
        freeze: !!m.freezeAuthority,
      });
    })().catch(() => alive && setToken(null));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenKey, connection]);

  useEffect(() => {
    if (!wallet.publicKey) return;
    let alive = true;
    const key = wallet.publicKey.toBase58();
    connection
      .getBalance(wallet.publicKey)
      .then((l) => alive && setSolBal({ key, sol: l / LAMPORTS_PER_SOL }))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [wallet.publicKey, connection]);

  const t = Number(tokenAmount);
  const s = Number(solAmount);
  const price = t > 0 && s > 0 ? s / t : 0;
  const mcapSol = info?.supply && price ? info.supply * price : 0;
  const share = info?.supply && t > 0 ? Math.min(100, (t / info.supply) * 100) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!wallet.publicKey) return wallet.connect();
    if (!mintKey) return setError("Enter a valid token address.");
    if (!(t > 0) || !(s > 0)) return setError("Enter both a token amount and a SOL amount.");
    setBusy(true);
    try {
      const { tx, positionNft, pool } = await buildCreatePoolTx(connection, {
        owner: wallet.publicKey,
        tokenMint: mintKey,
        tokenAmount,
        solAmount,
        feeBps,
        lockLiquidity: lock,
      });
      const sig = await sendAndConfirm(wallet, connection, tx, [positionNft]);
      setDone({ pool: pool.toBase58(), sig });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <SuccessPanel title="Pool live on Meteora" address={done.pool}>
        <a href={`https://dexscreener.com/solana/${done.pool}`} target="_blank" rel="noreferrer" className="sm:col-span-2">
          <Button size="lg" className="w-full">View on DexScreener</Button>
        </a>
        <Link href="/my-coins" className="sm:col-span-2">
          <Button variant="ghost" className="w-full">Track it in My Coins</Button>
        </Link>
        <ExternalLink href={`https://solscan.io/account/${done.pool}`}>Pool</ExternalLink>
        <ExternalLink href={solscanTx(done.sig)}>Transaction</ExternalLink>
      </SuccessPanel>
    );
  }

  const symbol = info?.symbol ?? "TOKEN";

  return (
    <form onSubmit={submit} className="rise mx-auto grid w-full max-w-[540px] grid-cols-[minmax(0,1fr)] gap-4">
      <Card3D className="grid grid-cols-[minmax(0,1fr)] gap-4 p-5 sm:p-8">
        <Field label="Token address" hint={mintKey && !info ? "Looking up token…" : undefined}>
          <div className="relative">
            <Input value={mint} onChange={(e) => setMint(e.target.value.trim())} placeholder="Paste your token mint" spellCheck={false} className="pr-24 font-mono text-sm" />
            {!mint && (
              <button
                type="button"
                onClick={() => navigator.clipboard?.readText().then((v) => setMint(v.trim())).catch(() => {})}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-semibold text-muted hover:text-text"
              >
                Paste
              </button>
            )}
          </div>
        </Field>

        {info?.freeze && <Notice tone="error">This token still has a freeze authority. Meteora pools need it revoked.</Notice>}

        <div className="relative grid grid-cols-[minmax(0,1fr)] gap-2">
          <AmountRow
            label="Deposit"
            value={tokenAmount}
            onChange={setTokenAmount}
            balance={info ? fmt(Number(info.balance), 2) : undefined}
            onMax={info ? () => setTokenAmount(info.balance) : undefined}
            onHalf={info ? () => setTokenAmount(String(Number(info.balance) / 2)) : undefined}
            token={
              <>
                <TokenAvatar src={info?.image} label={symbol} size={26} />
                <span className="max-w-[90px] truncate text-sm font-semibold">{symbol}</span>
              </>
            }
          />
          <span className="absolute left-1/2 top-1/2 z-10 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-xl border-4 border-surface bg-surface-2 text-muted">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          </span>
          <AmountRow
            label="Pair with"
            value={solAmount}
            onChange={setSolAmount}
            balance={sol !== null ? fmt(sol) : undefined}
            onMax={sol !== null ? () => setSolAmount(String(Math.max(0, +(sol - SOL_RESERVE - lamportsToSol(FEES.createLiquidity)).toFixed(4)))) : undefined}
            token={
              <>
                <SolLogo size={26} />
                <span className="text-sm font-semibold">SOL</span>
              </>
            }
          />
        </div>

        <Field label="Swap fee" hint="Earned by your position on every trade, paid in SOL">
          <Segmented value={feeBps} onChange={setFeeBps} options={FEE_TIERS.map((b) => ({ value: b, label: `${b / 100}%` }))} />
        </Field>

        <div className="rounded-2xl border border-white/[.05] bg-black/20 px-4 py-3">
          <Row label="Starting price">{price ? <span className="font-mono">{price.toPrecision(4)} SOL</span> : "—"}</Row>
          <Row label="Starting market cap">{mcapSol ? <span className="font-mono">{fmt(mcapSol, 2)} SOL</span> : "—"}</Row>
          <Row label="Supply in pool">{share ? `${fmt(share, 1)}%` : "—"}</Row>
          <Row label="Pool type">DAMM v2 · full range</Row>
        </div>

        <ToggleRow
          checked={lock}
          onChange={setLock}
          title="Lock liquidity forever"
          text="You can never withdraw it; swap fees stay claimable on Meteora. Buyers see the pool cannot be rugged."
        />

        <Button type="submit" size="lg" loading={busy} disabled={!!info?.freeze}>
          {!wallet.publicKey ? "Connect Wallet" : busy ? "Confirm in wallet…" : "Create Liquidity"}
        </Button>
        <p className="-mt-1 text-center text-xs text-dim">
          {lamportsToSol(FEES.createLiquidity)} SOL service + ≈{POOL_RENT_ESTIMATE_SOL} SOL Meteora pool rent
        </p>
      </Card3D>

      {error && <Notice tone="error">{error}</Notice>}
    </form>
  );
}
