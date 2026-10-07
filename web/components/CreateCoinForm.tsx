"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useAppWallet } from "@/lib/client/wallet";
import { buildCreateCoinTx, coinFee } from "@/lib/chain/token";
import { MAX_NAME, MAX_SYMBOL } from "@/lib/chain/metaplex";
import { FEES, lamportsToSol } from "@/lib/config";
import { friendlyError, sendAndConfirm, solscanToken, solscanTx } from "@/lib/client/send";
import type { CoinInfo } from "@/lib/dexscreener";
import { Card3D } from "@/components/Card3D";
import { Button, ExternalLink, Field, Input, Notice, SuccessPanel, Textarea, Toggle } from "@/components/ui";

const RENT_ESTIMATE_SOL = 0.02; // mint + metadata + token account (on-chain storage)
const ACCEPT = "image/png,image/jpeg,image/gif,image/webp";

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

const EMPTY: Form = { name: "", symbol: "", decimals: "6", supply: "", description: "", website: "", twitter: "", telegram: "" };
type Step = "" | "upload" | "sign";

const grouped = (s: string) => (s ? BigInt(s).toLocaleString("en-US") : "");

function ImageDrop({ preview, onFile }: { preview: string | null; onFile: (f: File) => void }) {
  const [over, setOver] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={`field group relative grid h-full min-h-[148px] w-full cursor-pointer place-items-center overflow-hidden rounded-2xl border-dashed transition ${
        over ? "border-ember" : "hover:border-ember/50"
      }`}
    >
      <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <span className="absolute inset-0 grid place-items-center bg-black/55 text-xs font-semibold opacity-0 transition group-hover:opacity-100">Change image</span>
        </>
      ) : (
        <span className="flex flex-col items-center gap-2 px-3 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-muted transition group-hover:text-ember">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 16V4m-5 5 5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></svg>
          </span>
          <span className="text-xs font-medium text-muted">Drop or click</span>
          <span className="text-[10px] text-dim">PNG · JPG · GIF · WebP · 4 MB</span>
        </span>
      )}
    </label>
  );
}

function Progress({ step }: { step: Step }) {
  const items = [
    { key: "upload", label: "Upload metadata" },
    { key: "sign", label: "Sign & confirm" },
  ];
  const idx = items.findIndex((i) => i.key === step);
  return (
    <div className="mt-4 grid gap-2">
      {items.map((it, i) => (
        <div key={it.key} className="flex items-center gap-2.5 text-xs">
          <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${i < idx ? "bg-good text-bg" : i === idx ? "bg-brand text-white" : "bg-line text-dim"}`}>
            {i < idx ? "✓" : i + 1}
          </span>
          <span className={i === idx ? "text-text" : "text-dim"}>{it.label}</span>
          {i === idx && <span className="ml-auto h-3 w-3 animate-spin rounded-full border-2 border-line border-t-ember" />}
        </div>
      ))}
    </div>
  );
}

export function CreateCoinForm({ copy }: { copy?: string }) {
  const { connection } = useConnection();
  const wallet = useAppWallet();

  const [form, setForm] = useState<Form>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [copiedImage, setCopiedImage] = useState<string | null>(null);
  const [copied, setCopied] = useState<CoinInfo | null>(null);
  const [loadingCopy, setLoadingCopy] = useState(!!copy);
  const [opts, setOpts] = useState({ revokeFreeze: true, revokeMint: false, revokeUpdate: false });
  const [more, setMore] = useState(false);
  const [step, setStep] = useState<Step>("");
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
      .catch(() => alive && setError("Could not load this coin."))
      .finally(() => alive && setLoadingCopy(false));
    return () => {
      alive = false;
    };
  }, [copy]);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : copiedImage), [file, copiedImage]);
  useEffect(() => () => void (file && preview && URL.revokeObjectURL(preview)), [file, preview]);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const fee = coinFee(opts);

  function pickFile(f: File) {
    if (!ACCEPT.split(",").includes(f.type)) return setError("Image must be PNG, JPG, GIF or WebP.");
    if (f.size > 4 * 1024 * 1024) return setError("Image must be 4 MB or smaller.");
    setError("");
    setFile(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!wallet.publicKey) return wallet.connect();
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
      <SuccessPanel title={`${form.name} is live`} address={done.mint}>
        <Link href={`/liquidity?mint=${done.mint}`} className="sm:col-span-2">
          <Button size="lg" className="w-full">Create Liquidity on Meteora</Button>
        </Link>
        <Link href="/my-coins" className="sm:col-span-2">
          <Button variant="ghost" className="w-full">View in My Coins</Button>
        </Link>
        <ExternalLink href={solscanToken(done.mint)}>Token</ExternalLink>
        <ExternalLink href={solscanTx(done.sig)}>Transaction</ExternalLink>
      </SuccessPanel>
    );
  }

  const busy = !!step;

  return (
    <form onSubmit={submit} className="rise mx-auto grid w-full max-w-[580px] grid-cols-[minmax(0,1fr)] gap-4">
      {copied && (
        <Notice tone="success">
          Copying <b>{copied.name}</b> · ${copied.symbol}. Every field stays editable.
        </Notice>
      )}

      <Card3D className="p-5 sm:p-7">
        <div className="grid gap-x-3 gap-y-4 sm:grid-cols-2">
          <Field center label="Name">
            <Input value={form.name} onChange={set("name")} maxLength={MAX_NAME} placeholder="Cosmic Cat" required />
          </Field>
          <Field center label="Symbol">
            <Input value={form.symbol} onChange={set("symbol")} maxLength={MAX_SYMBOL} placeholder="CCAT" required />
          </Field>

          <div className="grid content-start gap-4">
            <Field center label="Decimals">
              <Input value={form.decimals} onChange={set("decimals")} inputMode="numeric" maxLength={1} />
            </Field>
            <Field center label="Supply">
              <Input value={grouped(form.supply)} onChange={(e) => setForm((f) => ({ ...f, supply: e.target.value.replace(/\D/g, "").slice(0, 15) }))} inputMode="numeric" placeholder="1,000,000,000" required />
            </Field>
          </div>
          <div className="flex flex-col">
            <span className="mb-2 text-center font-display text-[13px] font-bold">Image</span>
            <div className="flex-1">{loadingCopy ? <div className="skeleton h-full min-h-[132px] rounded-2xl" /> : <ImageDrop preview={preview} onFile={pickFile} />}</div>
          </div>

          <div className="sm:col-span-2">
            <Field center label="Description">
              <Textarea value={form.description} onChange={set("description")} maxLength={1000} placeholder="Tell people what your coin is about" className="!min-h-[84px]" />
            </Field>
          </div>
        </div>

        <div className="mt-7 grid gap-6 sm:grid-cols-2">
          <Toggle
            center
            checked={opts.revokeFreeze}
            onChange={(v) => setOpts((o) => ({ ...o, revokeFreeze: v }))}
            title="Revoke Freeze (required)"
            price={`${lamportsToSol(FEES.revokeFreeze)} SOL`}
            text="Revoke Freeze allows you to create a liquidity pool"
          />
          <Toggle
            center
            checked={opts.revokeMint}
            onChange={(v) => setOpts((o) => ({ ...o, revokeMint: v }))}
            title="Revoke Mint"
            price={`${lamportsToSol(FEES.revokeMint)} SOL`}
            text="Mint Authority allows you to increase tokens supply"
          />
        </div>

        <button type="button" onClick={() => setMore((m) => !m)} className="mt-6 flex items-center gap-1.5 font-display text-[14px] font-semibold text-text/90 hover:text-text">
          {more ? "Hide Options" : "Show More Options"}
          <svg className={`transition ${more ? "rotate-180" : ""}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
        </button>
        {more && (
          <div className="rise mt-5 grid gap-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field center label="Website"><Input value={form.website} onChange={set("website")} placeholder="https://" /></Field>
              <Field center label="X"><Input value={form.twitter} onChange={set("twitter")} placeholder="https://x.com/…" /></Field>
              <Field center label="Telegram"><Input value={form.telegram} onChange={set("telegram")} placeholder="https://t.me/…" /></Field>
            </div>
            <div className="mx-auto sm:w-1/2">
              <Toggle
                center
                checked={opts.revokeUpdate}
                onChange={(v) => setOpts((o) => ({ ...o, revokeUpdate: v }))}
                title="Revoke Update"
                price={`${lamportsToSol(FEES.revokeUpdate)} SOL`}
                text="Name, symbol and image can never be changed"
              />
            </div>
          </div>
        )}

        <Button type="submit" size="lg" loading={busy} className="mt-6 w-full !text-[17px]">
          {!wallet.publicKey ? "Connect Wallet" : step === "upload" ? "Uploading…" : step === "sign" ? "Confirm in wallet…" : copied ? "Copy Coin" : "Create Coin"}
        </Button>
        {busy && <Progress step={step} />}
        <p className="mt-4 text-center text-[13px] font-medium text-muted">
          Total cost: <span className="font-display font-bold text-text">{lamportsToSol(fee).toFixed(2)} SOL</span>
        </p>
        <p className="mt-1 text-center text-[11px] text-dim">+ ≈{RENT_ESTIMATE_SOL} SOL Solana network rent</p>
      </Card3D>

      {error && <Notice tone="error">{error}</Notice>}
    </form>
  );
}
