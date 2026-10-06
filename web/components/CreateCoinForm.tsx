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
import { Button, Card, ExternalLink, Field, Input, Notice, Row, SectionLabel, SuccessPanel, Textarea, Toggle, TokenAvatar } from "@/components/ui";

const RENT_ESTIMATE_SOL = 0.02; // mint + metadata + token account (on-chain storage)
const SUPPLY_PRESETS = [
  { label: "1M", value: "1000000" },
  { label: "100M", value: "100000000" },
  { label: "1B", value: "1000000000" },
  { label: "10B", value: "10000000000" },
];
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

const EMPTY: Form = { name: "", symbol: "", decimals: "6", supply: "1000000000", description: "", website: "", twitter: "", telegram: "" };
type Step = "" | "upload" | "sign";

const grouped = (s: string) => (s ? BigInt(s).toLocaleString("en-US") : "0");

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
      className={`group relative grid aspect-square w-full cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed transition ${
        over ? "border-ember bg-ember/5" : "border-line-hi bg-bg/50 hover:border-ember/60"
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

function Steps({ step }: { step: Step }) {
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
  const wallet = useWallet();
  const { setVisible } = useWalletModal();

  const [form, setForm] = useState<Form>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [copiedImage, setCopiedImage] = useState<string | null>(null);
  const [copied, setCopied] = useState<CoinInfo | null>(null);
  const [loadingCopy, setLoadingCopy] = useState(!!copy);
  const [opts, setOpts] = useState({ revokeFreeze: true, revokeMint: true, revokeUpdate: false });
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
      <SuccessPanel title={`${form.name} is live`} address={done.mint}>
        <Link href={`/create-liquidity?mint=${done.mint}`} className="sm:col-span-2">
          <Button size="lg" className="w-full">Create Liquidity on Meteora</Button>
        </Link>
        <ExternalLink href={solscanToken(done.mint)}>Token</ExternalLink>
        <ExternalLink href={solscanTx(done.sig)}>Transaction</ExternalLink>
      </SuccessPanel>
    );
  }

  const busy = !!step;

  return (
    <form onSubmit={submit} className="rise grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="grid gap-5">
        {copied && (
          <Notice tone="success">
            Copying <b>{copied.name}</b> · ${copied.symbol}. Every field stays editable.
          </Notice>
        )}

        <Card>
          <SectionLabel>Token details</SectionLabel>
          <div className="grid gap-5 sm:grid-cols-[148px_minmax(0,1fr)]">
            <div className="w-32 sm:w-auto">{loadingCopy ? <div className="skeleton aspect-square rounded-2xl" /> : <ImageDrop preview={preview} onFile={pickFile} />}</div>
            <div className="grid content-start gap-4">
              <Field label="Name" right={<span className="text-[11px] text-dim">{form.name.length}/{MAX_NAME}</span>}>
                <Input value={form.name} onChange={set("name")} maxLength={MAX_NAME} placeholder="Cosmic Cat" required />
              </Field>
              <Field label="Symbol" right={<span className="text-[11px] text-dim">{form.symbol.length}/{MAX_SYMBOL}</span>}>
                <Input value={form.symbol} onChange={set("symbol")} maxLength={MAX_SYMBOL} placeholder="CCAT" required />
              </Field>
            </div>
          </div>
          <div className="mt-4">
            <Field label="Description">
              <Textarea value={form.description} onChange={set("description")} maxLength={1000} placeholder="What is your coin about?" />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionLabel>Supply</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
            <Field label="Total supply" hint="Minted to your wallet">
              <Input value={grouped(form.supply)} onChange={(e) => setForm((f) => ({ ...f, supply: e.target.value.replace(/\D/g, "").slice(0, 15) }))} inputMode="numeric" />
            </Field>
            <Field label="Decimals" hint="6 is standard">
              <Input value={form.decimals} onChange={set("decimals")} inputMode="numeric" maxLength={1} />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {SUPPLY_PRESETS.map((p) => (
              <button
                type="button"
                key={p.value}
                onClick={() => setForm((f) => ({ ...f, supply: p.value }))}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${form.supply === p.value ? "ring-brand text-text" : "border-line text-dim hover:text-muted"}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <SectionLabel right={<span className="text-xs text-dim">Optional</span>}>Socials</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Website">
              <Input value={form.website} onChange={set("website")} placeholder="https://" />
            </Field>
            <Field label="X">
              <Input value={form.twitter} onChange={set("twitter")} placeholder="https://x.com/…" />
            </Field>
            <Field label="Telegram">
              <Input value={form.telegram} onChange={set("telegram")} placeholder="https://t.me/…" />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionLabel>Authorities</SectionLabel>
          <div className="grid gap-3 md:grid-cols-3">
            <Toggle
              checked={opts.revokeFreeze}
              onChange={(v) => setOpts((o) => ({ ...o, revokeFreeze: v }))}
              title="Revoke Freeze"
              badge="Needed for pool"
              price={`+${lamportsToSol(FEES.revokeFreeze)} SOL`}
              text="No one can ever freeze holders' tokens."
            />
            <Toggle
              checked={opts.revokeMint}
              onChange={(v) => setOpts((o) => ({ ...o, revokeMint: v }))}
              title="Revoke Mint"
              price={`+${lamportsToSol(FEES.revokeMint)} SOL`}
              text="Supply is fixed forever. Buyers trust it."
            />
            <Toggle
              checked={opts.revokeUpdate}
              onChange={(v) => setOpts((o) => ({ ...o, revokeUpdate: v }))}
              title="Revoke Update"
              price={`+${lamportsToSol(FEES.revokeUpdate)} SOL`}
              text="Name, symbol and image are locked."
            />
          </div>
        </Card>
      </div>

      {/* Summary: sticky on desktop */}
      <div className="grid gap-4 lg:sticky lg:top-24">
        <Card highlight>
          <div className="flex items-center gap-3.5">
            <TokenAvatar src={preview} label={form.symbol || form.name} size={56} />
            <div className="min-w-0">
              <div className="truncate font-display text-lg font-bold">{form.name || "Your coin"}</div>
              <div className="truncate text-sm text-muted">${form.symbol || "TICKER"}</div>
            </div>
          </div>
          <div className="my-5 h-px bg-line" />
          <Row label="Supply"><span className="font-mono">{grouped(form.supply)}</span></Row>
          <Row label="Decimals"><span className="font-mono">{form.decimals || "—"}</span></Row>
          <Row label="Program">SPL Token · Metaplex</Row>
          <div className="my-4 h-px bg-line" />
          <Row label="Service">{lamportsToSol(FEES.createCoin)} SOL</Row>
          {opts.revokeFreeze && <Row label="Revoke freeze">{lamportsToSol(FEES.revokeFreeze)} SOL</Row>}
          {opts.revokeMint && <Row label="Revoke mint">{lamportsToSol(FEES.revokeMint)} SOL</Row>}
          {opts.revokeUpdate && <Row label="Revoke update">{lamportsToSol(FEES.revokeUpdate)} SOL</Row>}
          <Row label="Network rent">≈{RENT_ESTIMATE_SOL} SOL</Row>
          <div className="mt-3 flex items-end justify-between rounded-xl bg-bg/60 px-4 py-3">
            <span className="text-sm text-muted">Total</span>
            <span className="font-display text-2xl font-bold">
              {lamportsToSol(fee + RENT_ESTIMATE_SOL * 1e9)} <span className="text-sm font-semibold text-muted">SOL</span>
            </span>
          </div>
          <Button type="submit" size="lg" loading={busy} className="mt-4 w-full">
            {!wallet.publicKey ? "Connect Wallet" : step === "upload" ? "Uploading…" : step === "sign" ? "Confirm in wallet…" : copied ? "Copy Coin" : "Create Coin"}
          </Button>
          {busy && <Steps step={step} />}
        </Card>
        {error && <Notice tone="error">{error}</Notice>}
        {!TREASURY && <Notice>Preview mode: service fees are not charged.</Notice>}
      </div>
    </form>
  );
}
