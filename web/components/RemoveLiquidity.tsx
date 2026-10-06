"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useAppWallet } from "@/lib/client/wallet";
import { buildRemoveTx, listPositions, type UserPosition } from "@/lib/chain/meteora";
import { FEES, lamportsToSol } from "@/lib/config";
import { friendlyError, sendAndConfirm, solscanTx } from "@/lib/client/send";
import { metadataImage } from "@/lib/client/token-image";
import { Button, Card, Notice, SolLogo, TokenAvatar } from "@/components/ui";

function PairIcon({ uri, symbol }: { uri: string; symbol: string }) {
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    metadataImage(uri).then((i) => alive && setImg(i));
    return () => {
      alive = false;
    };
  }, [uri]);
  return (
    <span className="relative flex shrink-0">
      <TokenAvatar src={img} label={symbol} size={44} />
      <span className="-ml-3 mt-5 rounded-full ring-4 ring-surface"><SolLogo size={26} /></span>
    </span>
  );
}

function Amount({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-line bg-bg/50 px-3 py-2.5">
      {icon}
      <div className="min-w-0">
        <div className="truncate text-[11px] text-dim">{label}</div>
        <div className="truncate font-mono text-sm">{value}</div>
      </div>
    </div>
  );
}

export function RemoveLiquidity() {
  const { connection } = useConnection();
  const wallet = useAppWallet();
  const [positions, setPositions] = useState<UserPosition[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [lastSig, setLastSig] = useState("");

  const load = useCallback(async () => {
    if (!wallet.publicKey) return;
    setError("");
    try {
      setPositions(await listPositions(connection, wallet.publicKey));
    } catch (e) {
      setPositions([]);
      setError(friendlyError(e));
    }
  }, [connection, wallet.publicKey]);

  useEffect(() => {
    if (!wallet.publicKey) return;
    let alive = true;
    listPositions(connection, wallet.publicKey)
      .then((p) => alive && setPositions(p))
      .catch((e) => {
        if (!alive) return;
        setPositions([]);
        setError(friendlyError(e));
      });
    return () => {
      alive = false;
    };
  }, [connection, wallet.publicKey]);

  async function remove(p: UserPosition) {
    if (!wallet.publicKey) return;
    setBusy(p.position.toBase58());
    setError("");
    try {
      const tx = await buildRemoveTx(connection, wallet.publicKey, p);
      setLastSig(await sendAndConfirm(wallet, connection, tx));
      await load();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }

  if (!wallet.publicKey) {
    return (
      <Card highlight className="rise mx-auto max-w-md py-10 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-surface-2 text-ember">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 7h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zm0 0 2.5-3h11M16.5 13.5h1" /></svg>
        </div>
        <h2 className="font-display text-lg font-semibold">Connect your wallet</h2>
        <p className="mt-1.5 text-sm text-muted">Use the wallet that created the pool.</p>
        <Button className="mt-6" onClick={() => wallet.connect()}>Connect Wallet</Button>
      </Card>
    );
  }

  return (
    <div className="rise mx-auto grid max-w-3xl gap-4">
      {error && <Notice tone="error">{error}</Notice>}
      {lastSig && (
        <Notice tone="success">
          Liquidity withdrawn to your wallet. <a className="underline" href={solscanTx(lastSig)} target="_blank" rel="noreferrer">View transaction</a>
        </Notice>
      )}
      {positions === null && [0, 1].map((i) => <div key={i} className="skeleton h-[132px] rounded-[20px]" />)}
      {positions?.length === 0 && (
        <Card className="py-12 text-center">
          <p className="font-display text-lg font-semibold">No positions yet</p>
          <p className="mt-1.5 text-sm text-muted">This wallet has no Meteora DAMM v2 liquidity.</p>
        </Card>
      )}
      {positions?.map((p) => {
        const id = p.position.toBase58();
        return (
          <Card key={id} className="transition hover:border-line-hi">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3.5">
                <PairIcon uri={p.uri} symbol={p.symbol} />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-display text-lg font-bold">{p.symbol}<span className="text-muted">/SOL</span></span>
                    {p.locked && <span className="rounded-md bg-sun/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sun">Locked</span>}
                  </div>
                  <a href={`https://solscan.io/account/${p.pool.toBase58()}`} target="_blank" rel="noreferrer" className="font-mono text-xs text-dim hover:text-muted">
                    {p.pool.toBase58().slice(0, 6)}…{p.pool.toBase58().slice(-6)}
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:w-[300px]">
                <Amount label={p.symbol} value={p.outToken} icon={<TokenAvatar label={p.symbol} size={20} />} />
                <Amount label="SOL" value={p.outSol} icon={<SolLogo size={20} />} />
              </div>
            </div>
            <div className="mt-4 flex justify-end border-t border-line pt-4">
              {p.locked ? (
                <span className="text-sm text-dim">Permanently locked — fees claimable on Meteora</span>
              ) : (
                <Button onClick={() => remove(p)} loading={busy === id} disabled={!!busy} className="w-full sm:w-auto">
                  Remove All Liquidity
                </Button>
              )}
            </div>
          </Card>
        );
      })}
      {positions && positions.length > 0 && (
        <p className="text-center text-xs text-dim">
          {lamportsToSol(FEES.removeLiquidity)} SOL service fee · unclaimed swap fees are collected and the position rent is refunded
        </p>
      )}
    </div>
  );
}
