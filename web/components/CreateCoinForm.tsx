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
import { ChevronDown, Upload } from "lucide-react";
import { Button, ExternalLink, Notice, SuccessPanel } from "@/components/ui";

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
      className={`image-upload ${over ? "over" : ""}`}
      title="PNG, JPG, GIF or WebP · 4 MB max"
    >
      <input type="file" accept={ACCEPT} className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {preview ? <img src={preview} alt="" /> : <Upload size={22} strokeWidth={2} />}
    </label>
  );
}

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onClick} className={`switch ${on ? "on" : ""}`}>
      <span />
    </button>
  );
}

function Progress({ step }: { step: Step }) {
  const items = [
    { key: "upload", label: "Upload metadata" },
    { key: "sign", label: "Sign & confirm" },
  ];
  const idx = items.findIndex((i) => i.key === step);
  return (
    <div className="mt-3 grid gap-1.5">
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
  const authority = (key: "revokeFreeze" | "revokeMint" | "revokeUpdate", title: React.ReactNode, text: string, price: number) => (
    <div className="authority">
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
      <div className="control-row">
        <Switch on={opts[key]} onClick={() => setOpts((o) => ({ ...o, [key]: !o[key] }))} label={key} />
        <span>({lamportsToSol(price)} SOL)</span>
      </div>
    </div>
  );

  return (
    <form onSubmit={submit} className="rise grid gap-3">
      {copied && (
        <Notice tone="success">
          Copying <b>{copied.name}</b> · ${copied.symbol}. Every field stays editable.
        </Notice>
      )}

      <div className="token-card">
        <div className="field-grid">
          <label className="cc-field">
            Name
            <input value={form.name} onChange={set("name")} maxLength={MAX_NAME} required />
          </label>
          <label className="cc-field">
            Symbol
            <input value={form.symbol} onChange={set("symbol")} maxLength={MAX_SYMBOL} required />
          </label>
          <label className="cc-field">
            Decimals
            <input value={form.decimals} onChange={set("decimals")} inputMode="numeric" maxLength={1} />
          </label>
          <div className="cc-field image-field">
            Image
            {loadingCopy ? <div className="skeleton h-[91px] rounded-lg" /> : <ImageDrop preview={preview} onFile={pickFile} />}
          </div>
          <label className="cc-field">
            Supply
            <input value={grouped(form.supply)} onChange={(e) => setForm((f) => ({ ...f, supply: e.target.value.replace(/\D/g, "").slice(0, 15) }))} inputMode="numeric" required />
          </label>
          <label className="cc-field field-wide">
            Description
            <textarea value={form.description} onChange={set("description")} maxLength={1000} />
          </label>
        </div>

        <div className="authority-grid">
          {authority("revokeFreeze", <>Revoke Freeze <em>(required)</em></>, "Revoke Freeze allows you to create a liquidity pool", FEES.revokeFreeze)}
          {authority("revokeMint", "Revoke Mint", "Mint Authority allows you to increase tokens supply", FEES.revokeMint)}
        </div>

        <button type="button" className="more-options" onClick={() => setMore((m) => !m)}>
          {more ? "Hide Options" : "Show More Options"}
          <ChevronDown size={14} className={`transition ${more ? "rotate-180" : ""}`} />
        </button>
        {more && (
          <div className="rise -mt-2 mb-5">
            <div className="field-grid !grid-cols-3">
              <label className="cc-field">Website<input value={form.website} onChange={set("website")} placeholder="https://" /></label>
              <label className="cc-field">X<input value={form.twitter} onChange={set("twitter")} placeholder="https://x.com/…" /></label>
              <label className="cc-field">Telegram<input value={form.telegram} onChange={set("telegram")} placeholder="https://t.me/…" /></label>
            </div>
            <div className="authority-grid">
              {authority("revokeUpdate", "Revoke Update", "Name, symbol and image can never be changed", FEES.revokeUpdate)}
            </div>
          </div>
        )}

        <button type="submit" className="select-wallet" disabled={busy}>
          {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#052e16]/30 border-t-[#052e16]" />}
          {!wallet.publicKey ? "Connect Wallet" : step === "upload" ? "Uploading…" : step === "sign" ? "Confirm in wallet…" : copied ? "Copy Coin" : "Create Coin"}
        </button>
        {busy && <Progress step={step} />}
        <p className="total-cost" title={`Service fee. Solana also charges ≈${RENT_ESTIMATE_SOL} SOL of network rent for storing the token.`}>Total cost: {lamportsToSol(fee).toFixed(2).replace(".", ",")} SOL</p>
      </div>

      {error && <Notice tone="error">{error}</Notice>}
    </form>
  );
}
