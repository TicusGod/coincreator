"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { buildCreateCoinTx, coinFee } from "@/lib/chain/token";
import { MAX_NAME, MAX_SYMBOL } from "@/lib/chain/metaplex";
import { FEES, TREASURY, lamportsToSol } from "@/lib/config";
import { friendlyError, sendAndConfirm, solscanToken, solscanTx } from "@/lib/client/send";
import type { CoinInfo } from "@/lib/dexscreener";
import { Button, Card, Field, Input, Notice, Textarea, Toggle } from "@/components/ui";

const RENT_ESTIMATE_SOL = 0.02; // mint + metadata + token account, refunded never (on-chain storage)

interface Form {
  name: string;
  symbol: string;
  decimals: string;
  supply: string;
  description: string;
  website: string;
  twitter: string;
  telegram: string;
}

const EMPTY: Form = { name: "", symbol: "", decimals: "6", supply: "1000000000", description: "", website: "", twitter: "", telegram: "" };

export function CreateCoinForm({ copy }: { copy?: string }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { setVisible } = useWalletModal();

  const [form, setForm] = useState<Form>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [copiedImage, setCopiedImage] = useState<string | null>(null);
  const [copied, setCopied] = useState<CoinInfo | null>(null);
  const [opts, setOpts] = useState({ revokeFreeze: true, revokeMint: true, revokeUpdate: false });
  const [step, setStep] = useState<"" | "upload" | "sign">("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ mint: string; sig: string } | null>(null);

  // Copy Coin: prefill from DexScreener.
  useEffect(() => {
    if (!copy) return;
    let alive = true;
    fetch(`/api/coin/${copy}`)
      .then((r) => r.json())
      .then((d: { coin?: CoinInfo; error?: string }) => {
        if (!alive) return;
        if (!d.coin) return setError(d.error ?? "Could not load this coin.");
        const c = d.coin;
        setCopied(c);
        setCopiedImage(c.imageUrl);
        setForm((f) => ({
          ...f,
          name: c.name.slice(0, MAX_NAME),
          symbol: c.symbol.slice(0, MAX_SYMBOL),
          description: c.description,
          website: c.website ?? "",
          twitter: c.twitter ?? "",
          telegram: c.telegram ?? "",
        }));
      })
      .catch(() => alive && setError("Could not load this coin."));
    return () => {
      alive = false;
    };
  }, [copy]);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : copiedImage), [file, copiedImage]);
  useEffect(() => () => void (file && preview && URL.revokeObjectURL(preview)), [file, preview]);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fee = coinFee(opts);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!wallet.publicKey) return setVisible(true);
    const decimals = Number(form.decimals);
    if (!form.name.trim() || !form.symbol.trim()) return setError("Name and symbol are required.");
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 9) return setError("Decimals must be between 0 and 9.");
    if (!/^\d+$/.test(form.supply) || BigInt(form.supply) === BigInt(0)) return setError("Supply must be a whole number above 0.");
    if (!file && !copiedImage) return setError("Add an image for your coin.");

    try {
      setStep("upload");
      const body = new FormData();
      for (const k of ["name", "symbol", "description", "website", "twitter", "telegram"] as const) body.append(k, form[k].trim());
      if (file) body.append("file", file);
      else if (copiedImage) body.append("imageUrl", copiedImage);
      const up = await fetch("/api/upload", { method: "POST", body });
      const data = (await up.json()) as { uri?: string; error?: string };
      if (!data.uri) throw new Error(data.error ?? "Upload failed.");

      setStep("sign");
      const { tx, mint } = await buildCreateCoinTx(connection, {
        owner: wallet.publicKey,
        name: form.name.trim(),
        symbol: form.symbol.trim(),
        uri: data.uri,
        decimals,
        supply: BigInt(form.supply),
        ...opts,
      });
      const sig = await sendAndConfirm(wallet, connection, tx, [mint]);
      setDone({ mint: mint.publicKey.toBase58(), sig });
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setStep("");
    }
  }

  if (done) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-accent/15 text-accent">✓</div>
        <h2 className="text-xl font-semibold">{form.name} is live</h2>
        <p className="mt-2 break-all font-mono text-xs text-muted">{done.mint}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link href={`/create-liquidity?mint=${done.mint}`}>
            <Button className="w-full">Create Liquidity on Meteora</Button>
          </Link>
          <a href={solscanToken(done.mint)} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center rounded-xl border border-line px-5 text-sm">
            View on Solscan
          </a>
        </div>
        <a href={solscanTx(done.sig)} target="_blank" rel="noreferrer" className="mt-4 inline-block text-xs text-muted underline">
          Transaction
        </a>
      </Card>
    );
  }

  return (
    <form onSubmit={submit} className="mx-auto grid max-w-3xl gap-5">
      {copied && (
        <Notice tone="success">
          Copying <b>{copied.name}</b> (${copied.symbol}). Everything below is editable.
        </Notice>
      )}
      <Card className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" hint={`Max ${MAX_NAME} characters`}>
          <Input value={form.name} onChange={set("name")} maxLength={MAX_NAME} placeholder="Cosmic Cat" required />
        </Field>
        <Field label="Symbol" hint={`Max ${MAX_SYMBOL} characters`}>
          <Input value={form.symbol} onChange={set("symbol")} maxLength={MAX_SYMBOL} placeholder="CCAT" required />
        </Field>
        <Field label="Decimals" hint="6 is the standard">
          <Input value={form.decimals} onChange={set("decimals")} inputMode="numeric" />
        </Field>
        <Field label="Supply" hint="Minted to your wallet">
          <Input value={form.supply} onChange={(e) => setForm((f) => ({ ...f, supply: e.target.value.replace(/\D/g, "") }))} inputMode="numeric" />
        </Field>
        <Field label="Image" hint="PNG, JPG, GIF or WebP · 4 MB max">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-line bg-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {preview && <img src={preview} alt="" className="h-full w-full object-cover" />}
            </div>
            <Input type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="file:mr-3 file:rounded-lg file:border-0 file:bg-accent/15 file:px-3 file:py-1 file:text-accent" />
          </div>
        </Field>
        <Field label="Description">
          <Textarea value={form.description} onChange={set("description")} maxLength={1000} placeholder="Tell people about your coin" />
        </Field>
      </Card>

      <Card className="grid gap-4 sm:grid-cols-3">
        <Field label="Website">
          <Input value={form.website} onChange={set("website")} placeholder="https://" />
        </Field>
        <Field label="X">
          <Input value={form.twitter} onChange={set("twitter")} placeholder="https://x.com/…" />
        </Field>
        <Field label="Telegram">
          <Input value={form.telegram} onChange={set("telegram")} placeholder="https://t.me/…" />
        </Field>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Toggle
          checked={opts.revokeFreeze}
          onChange={(v) => setOpts((o) => ({ ...o, revokeFreeze: v }))}
          title="Revoke Freeze"
          price={`+${lamportsToSol(FEES.revokeFreeze)} SOL`}
          text="Required to create a Meteora pool. No one can freeze holders' tokens."
        />
        <Toggle
          checked={opts.revokeMint}
          onChange={(v) => setOpts((o) => ({ ...o, revokeMint: v }))}
          title="Revoke Mint"
          price={`+${lamportsToSol(FEES.revokeMint)} SOL`}
          text="Supply is fixed forever. Buyers trust coins that cannot be inflated."
        />
        <Toggle
          checked={opts.revokeUpdate}
          onChange={(v) => setOpts((o) => ({ ...o, revokeUpdate: v }))}
          title="Revoke Update"
          price={`+${lamportsToSol(FEES.revokeUpdate)} SOL`}
          text="Name, symbol and image can never be changed."
        />
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {!TREASURY && <Notice>Preview mode: service fees are not charged.</Notice>}

      <div className="flex flex-col items-center gap-2">
        <Button type="submit" loading={!!step} className="w-full sm:w-72">
          {!wallet.publicKey ? "Connect Wallet" : step === "upload" ? "Uploading…" : step === "sign" ? "Confirm in wallet…" : "Create Coin"}
        </Button>
        <p className="text-xs text-muted">
          Total ≈ {lamportsToSol(fee + RENT_ESTIMATE_SOL * 1e9)} SOL ({lamportsToSol(fee)} SOL service + ≈{RENT_ESTIMATE_SOL} SOL network rent)
        </p>
      </div>
    </form>
  );
}
