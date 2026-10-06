"use client";

import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { FEE_TIERS, buildCreatePoolTx } from "@/lib/chain/meteora";
import { FEES, TREASURY, lamportsToSol } from "@/lib/config";
import { friendlyError, sendAndConfirm, solscanTx } from "@/lib/client/send";
import { Button, Card, Field, Input, Notice, Toggle } from "@/components/ui";

const POOL_RENT_ESTIMATE_SOL = 0.03;

const parseKey = (s: string) => {
  try {
    return new PublicKey(s.trim());
  } catch {
    return null;
  }
};

export function CreateLiquidityForm({ initialMint = "" }: { initialMint?: string }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { setVisible } = useWalletModal();

  const [mint, setMint] = useState(initialMint);
  const [tokenAmount, setTokenAmount] = useState("");
  const [solAmount, setSolAmount] = useState("");
  const [feeBps, setFeeBps] = useState<number>(100);
  const [lock, setLock] = useState(false);
  const [fetched, setFetched] = useState<{ key: string; ui: string; supply: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ pool: string; sig: string } | null>(null);

  const mintKey = parseKey(mint);
  const balanceKey = mintKey && wallet.publicKey ? `${mintKey.toBase58()}:${wallet.publicKey.toBase58()}` : "";
  const balance = fetched && fetched.key === balanceKey ? fetched : null;

  useEffect(() => {
    if (!mintKey || !wallet.publicKey) return;
    let alive = true;
    Promise.all([
      connection.getParsedTokenAccountsByOwner(wallet.publicKey, { mint: mintKey }),
      connection.getParsedAccountInfo(mintKey),
    ])
      .then(([accs, info]) => {
        if (!alive) return;
        const ui = accs.value[0]?.account.data.parsed.info.tokenAmount.uiAmountString ?? "0";
        const parsed = info.value?.data && "parsed" in info.value.data ? info.value.data.parsed.info : null;
        setFetched({ key: balanceKey, ui, supply: parsed ? Number(parsed.supply) / 10 ** parsed.decimals : 0 });
      })
      .catch(() => alive && setFetched(null));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balanceKey, connection]);

  const t = Number(tokenAmount);
  const s = Number(solAmount);
  const price = t > 0 && s > 0 ? s / t : 0;
  const mcapSol = balance?.supply && price ? balance.supply * price : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!wallet.publicKey) return setVisible(true);
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
      <Card className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-accent/15 text-accent">✓</div>
        <h2 className="text-xl font-semibold">Pool created on Meteora</h2>
        <p className="mt-2 break-all font-mono text-xs text-muted">{done.pool}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <a href={`https://dexscreener.com/solana/${done.pool}`} target="_blank" rel="noreferrer">
            <Button className="w-full">View on DexScreener</Button>
          </a>
          <a href={solscanTx(done.sig)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center rounded-xl border border-line px-5 text-sm">
            Transaction
          </a>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-xl gap-5">
      <Card className="grid gap-4">
        <Field label="Token address" hint={balance ? `Wallet balance: ${balance.ui}` : "The coin you created (freeze authority revoked)"}>
          <Input value={mint} onChange={(e) => setMint(e.target.value)} placeholder="Token mint address" spellCheck={false} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Token amount">
            <div className="relative">
              <Input value={tokenAmount} onChange={(e) => setTokenAmount(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="800000000" />
              {balance && (
                <button type="button" onClick={() => setTokenAmount(balance.ui)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-accent/15 px-2 py-0.5 text-xs text-accent">
                  Max
                </button>
              )}
            </div>
          </Field>
          <Field label="SOL amount">
            <Input value={solAmount} onChange={(e) => setSolAmount(e.target.value.replace(/[^\d.]/g, ""))} inputMode="decimal" placeholder="1" />
          </Field>
        </div>
        <Field label="Swap fee" hint="Earned by your position on every trade, paid in SOL">
          <div className="grid grid-cols-4 gap-2">
            {FEE_TIERS.map((b) => (
              <button
                type="button"
                key={b}
                onClick={() => setFeeBps(b)}
                className={`rounded-xl border py-2 text-sm ${feeBps === b ? "border-accent/60 bg-accent/10 text-accent" : "border-line text-muted"}`}
              >
                {b / 100}%
              </button>
            ))}
          </div>
        </Field>
        {price > 0 && (
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-bg p-4 text-sm">
            <div>
              <div className="text-xs text-muted">Starting price</div>
              <div className="mt-1 font-mono">{price.toPrecision(4)} SOL</div>
            </div>
            <div>
              <div className="text-xs text-muted">Starting market cap</div>
              <div className="mt-1 font-mono">{mcapSol ? `${mcapSol.toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL` : "—"}</div>
            </div>
          </div>
        )}
      </Card>

      <Toggle
        checked={lock}
        onChange={setLock}
        title="Lock liquidity forever"
        text="You can never withdraw it; swap fees stay claimable on Meteora. Buyers see the pool cannot be rugged."
      />

      {error && <Notice tone="error">{error}</Notice>}
      {!TREASURY && <Notice>Preview mode: service fees are not charged.</Notice>}

      <div className="flex flex-col items-center gap-2">
        <Button type="submit" loading={busy} className="w-full sm:w-72">
          {!wallet.publicKey ? "Connect Wallet" : busy ? "Confirm in wallet…" : "Create Liquidity"}
        </Button>
        <p className="text-xs text-muted">
          {lamportsToSol(FEES.createLiquidity)} SOL service + ≈{POOL_RENT_ESTIMATE_SOL} SOL Meteora pool rent
        </p>
      </div>
    </form>
  );
}
