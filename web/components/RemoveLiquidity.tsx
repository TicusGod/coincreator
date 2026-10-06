"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { buildRemoveTx, listPositions, type UserPosition } from "@/lib/chain/meteora";
import { FEES, lamportsToSol } from "@/lib/config";
import { friendlyError, sendAndConfirm, solscanTx } from "@/lib/client/send";
import { Button, Card, Notice } from "@/components/ui";

export function RemoveLiquidity() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { setVisible } = useWalletModal();
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
      <Card className="mx-auto max-w-xl text-center">
        <p className="text-sm text-muted">Connect the wallet that created the pool.</p>
        <Button className="mt-4" onClick={() => setVisible(true)}>Connect Wallet</Button>
      </Card>
    );
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      {error && <Notice tone="error">{error}</Notice>}
      {lastSig && (
        <Notice tone="success">
          Liquidity withdrawn to your wallet.{" "}
          <a className="underline" href={solscanTx(lastSig)} target="_blank" rel="noreferrer">View transaction</a>
        </Notice>
      )}
      {positions === null && <Card className="animate-pulse text-center text-sm text-muted">Loading your Meteora positions…</Card>}
      {positions?.length === 0 && <Card className="text-center text-sm text-muted">No Meteora DAMM v2 positions in this wallet.</Card>}
      {positions?.map((p) => (
        <Card key={p.position.toBase58()} className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex-1">
            <div className="font-semibold">
              {p.name} <span className="text-muted">/ SOL</span>
            </div>
            <div className="mt-1 font-mono text-xs text-muted">{p.tokenMint.toBase58()}</div>
            <div className="mt-3 flex gap-6 text-sm">
              <div>
                <div className="text-xs text-muted">{p.symbol}</div>
                <div className="font-mono">{p.outToken}</div>
              </div>
              <div>
                <div className="text-xs text-muted">SOL</div>
                <div className="font-mono">{p.outSol}</div>
              </div>
            </div>
          </div>
          {p.locked ? (
            <span className="rounded-xl border border-line px-4 py-2 text-center text-sm text-muted">Locked forever</span>
          ) : (
            <Button onClick={() => remove(p)} loading={busy === p.position.toBase58()} disabled={!!busy}>
              Remove All
            </Button>
          )}
        </Card>
      ))}
      {positions && positions.length > 0 && (
        <p className="text-center text-xs text-muted">
          {lamportsToSol(FEES.removeLiquidity)} SOL service fee · unclaimed swap fees are collected and the position rent is refunded
        </p>
      )}
    </div>
  );
}
