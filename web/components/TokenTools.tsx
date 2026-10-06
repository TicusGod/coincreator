"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useAppWallet } from "@/lib/client/wallet";
import { buildMintMoreTx, buildRevokeMintTx, listMintableTokens, type MintableToken } from "@/lib/chain/token";
import { tokenLabels } from "@/lib/chain/meteora";
import { FEES, lamportsToSol } from "@/lib/config";
import { friendlyError, sendAndConfirm, solscanTx } from "@/lib/client/send";
import { Card3D } from "@/components/Card3D";
import { Button, Input, Notice } from "@/components/ui";

function TokenSelect({ tokens, value, onChange, loading }: { tokens: MintableToken[] | null; value: string; onChange: (v: string) => void; loading: boolean }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={!tokens?.length}
        className="field w-full appearance-none rounded-[14px] px-4 py-3.5 pr-10 text-[15px] text-text outline-none disabled:text-dim"
      >
        <option value="">{loading ? "Loading your tokens…" : tokens?.length === 0 ? "No token with your mint authority" : "Select Token"}</option>
        {tokens?.map((t) => (
          <option key={t.mint.toBase58()} value={t.mint.toBase58()}>
            {t.symbol} — {t.name} ({t.supply})
          </option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
    </div>
  );
}

export function TokenTools() {
  const { connection } = useConnection();
  const wallet = useAppWallet();
  const [tokens, setTokens] = useState<MintableToken[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [revokeMint, setRevokeMint] = useState("");
  const [mintMint, setMintMint] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState<"" | "revoke" | "mint">("");
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string; sig?: string } | null>(null);

  const refresh = useCallback(async () => {
    if (!wallet.publicKey) return;
    setLoading(true);
    try {
      setTokens(await listMintableTokens(connection, wallet.publicKey, (m) => tokenLabels(connection, m)));
    } catch {
      setTokens([]);
    } finally {
      setLoading(false);
    }
  }, [connection, wallet.publicKey]);

  useEffect(() => {
    if (!wallet.publicKey) return;
    let alive = true;
    listMintableTokens(connection, wallet.publicKey, (m) => tokenLabels(connection, m))
      .then((t) => alive && setTokens(t))
      .catch(() => alive && setTokens([]));
    return () => {
      alive = false;
    };
  }, [connection, wallet.publicKey]);

  async function run(kind: "revoke" | "mint") {
    if (!wallet.publicKey) return wallet.connect();
    const t = tokens?.find((x) => x.mint.toBase58() === (kind === "revoke" ? revokeMint : mintMint));
    if (!t) return setMsg({ tone: "error", text: "Select a token first." });
    setBusy(kind);
    setMsg(null);
    try {
      const tx = kind === "revoke" ? buildRevokeMintTx(wallet.publicKey, t.mint) : buildMintMoreTx(wallet.publicKey, t.mint, t.decimals, amount);
      const sig = await sendAndConfirm(wallet, connection, tx);
      setMsg({ tone: "success", text: kind === "revoke" ? `${t.symbol}: mint authority revoked. Supply is now fixed.` : `${amount} ${t.symbol} minted to your wallet.`, sig });
      setAmount("");
      await refresh();
    } catch (e) {
      setMsg({ tone: "error", text: friendlyError(e) });
    } finally {
      setBusy("");
    }
  }

  const cta = (label: string) => (wallet.publicKey ? label : "Select Wallet");

  return (
    <section className="mx-auto mt-14 w-full max-w-[680px]">
      <h2 className="font-display text-[22px] font-extrabold tracking-tight">Manage your coin</h2>
      <p className="mt-1.5 text-sm text-muted">Already created a coin with mint authority? Finish it here.</p>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <Card3D tilt={5} className="flex flex-col p-6">
          <h3 className="font-display text-[17px] font-extrabold">Revoke Mint Authority</h3>
          <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted">
            No more tokens can ever be minted beyond the total supply. Security and peace of mind for buyers. The cost is {lamportsToSol(FEES.revokeMint)} SOL.
          </p>
          <div className="mt-5 grid gap-3">
            <TokenSelect tokens={tokens} value={revokeMint} onChange={setRevokeMint} loading={loading || (!!wallet.publicKey && tokens === null)} />
            <Button onClick={() => run("revoke")} loading={busy === "revoke"} disabled={!!busy || (!!wallet.publicKey && !revokeMint)}>{cta("Revoke Mint")}</Button>
          </div>
        </Card3D>
        <Card3D tilt={5} className="flex flex-col p-6">
          <h3 className="font-display text-[17px] font-extrabold">Mint Token</h3>
          <p className="mt-2 flex-1 text-[13px] leading-relaxed text-muted">Mint more tokens to your wallet and grow the total supply. The cost is {lamportsToSol(FEES.mintMore)} SOL.</p>
          <div className="mt-5 grid gap-3">
            <TokenSelect tokens={tokens} value={mintMint} onChange={setMintMint} loading={loading || (!!wallet.publicKey && tokens === null)} />
            <label className="field block rounded-[14px] px-4 py-2.5">
              <span className="block text-[11px] font-semibold text-muted">Amount</span>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                placeholder="Enter amount to mint"
                inputMode="decimal"
                className="!border-0 !bg-transparent !p-0 !shadow-none"
              />
            </label>
            <Button onClick={() => run("mint")} loading={busy === "mint"} disabled={!!busy || (!!wallet.publicKey && (!mintMint || !amount))}>{cta("Mint Tokens")}</Button>
          </div>
        </Card3D>
      </div>
      {msg && (
        <div className="mt-4">
          <Notice tone={msg.tone}>
            {msg.text}{" "}
            {msg.sig && <a className="underline" href={solscanTx(msg.sig)} target="_blank" rel="noreferrer">View transaction</a>}
          </Notice>
        </div>
      )}
    </section>
  );
}
