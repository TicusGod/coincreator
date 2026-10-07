"use client";

// 3-step token form, copied from the owner's coincreate reference (TokenForm.tsx): basics → supply → socials & options.
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Upload } from "lucide-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { useAppWallet } from "@/lib/client/wallet";
import { launchCoin, type LaunchStage } from "@/lib/client/launch";
import { friendlyError } from "@/lib/client/send";
import { coinFee } from "@/lib/chain/token";
import { MAX_NAME, MAX_SYMBOL } from "@/lib/chain/metaplex";
import { FEES, lamportsToSol } from "@/lib/config";
import { LaunchSuccessModal } from "@/components/LaunchSuccessModal";
import { toast } from "@/components/Toaster";

const MAX_IMAGE = 4 * 1024 * 1024;
const SYMBOL_ALLOWED = /^[A-Za-z0-9]+$/;

const STAGE_LABEL: Record<LaunchStage, string> = {
  uploading: "Uploading image and metadata to IPFS…",
  signing: "Approve in your wallet…",
  confirming: "Submitting to the blockchain…",
};

interface Form {
  name: string;
  symbol: string;
  image: File | null;
  preview: string;
  decimals: string;
  supply: string;
  description: string;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
  modifyCreator: boolean;
  creatorName: string;
  creatorWebsite: string;
  revokeFreeze: boolean;
  revokeMint: boolean;
  revokeUpdate: boolean;
}

const INITIAL: Form = {
  name: "",
  symbol: "",
  image: null,
  preview: "",
  decimals: "9",
  supply: "1000000000",
  description: "",
  website: "",
  twitter: "",
  telegram: "",
  discord: "",
  modifyCreator: false,
  creatorName: "",
  creatorWebsite: "",
  revokeFreeze: true,
  revokeMint: true,
  revokeUpdate: false,
};

const inputCls = (error?: string) =>
  `w-full h-10 rounded-[12px] bg-[#18191b] border ${
    error ? "border-[#f87171]" : "border-[#212225]"
  } px-3 text-sm text-[#fafafa] placeholder-[#363a3f] transition-all duration-150 outline-none focus:border-[#696e77] shadow-[0_1px_rgba(0,0,0,0.05)]`;
const labelCls = "block text-sm font-semibold text-[#e4e4e7] mb-2";
const primaryBtn =
  "inline-flex items-center gap-2 h-10 px-5 rounded-[12px] bg-[#86efac] text-[#052e16] text-sm font-semibold transition-all duration-150 hover:bg-[#bbf7d0] active:translate-y-px";
const secondaryBtn =
  "inline-flex items-center gap-2 h-10 px-5 rounded-[12px] bg-[#212225] text-[#e4e4e7] text-sm font-semibold transition-all duration-150 hover:bg-[#272a2d] active:translate-y-px";

const Req = () => <span className="text-[#f87171]">*</span>;
const Err = ({ msg }: { msg?: string }) => (msg ? <p className="mt-1 text-xs text-[#f87171]">{msg}</p> : null);

function StepIndicator({ step }: { step: number }) {
  return (
    <div className="mb-8 flex items-center justify-center">
      {[1, 2, 3].map((n) => (
        <div key={n} className="flex items-center">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-150 ${
              n <= step ? "bg-[#86efac] text-[#052e16]" : "border border-[#272a2d] bg-[#212225] text-[#696e77]"
            }`}
          >
            {n < step ? <CheckCircle2 size={14} /> : n}
          </div>
          {n < 3 && <div className={`h-px w-16 transition-all duration-150 ${n < step ? "bg-[#86efac]" : "bg-[#212225]"}`} />}
        </div>
      ))}
    </div>
  );
}

function Switch({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`relative h-[22px] w-10 rounded-full transition-colors duration-150 ${on ? "bg-[#86efac]" : "bg-[#212225]"}`}
    >
      <span className={`absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-transform duration-150 ${on ? "translate-x-[18px]" : ""}`} />
    </button>
  );
}

export function CreateCoinForm() {
  const { connection } = useConnection();
  const wallet = useAppWallet();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<Form>(INITIAL);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [dragOver, setDragOver] = useState(false);
  const [stage, setStage] = useState<LaunchStage | null>(null);
  const [mint, setMint] = useState<string | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const options = { revokeFreeze: form.revokeFreeze, revokeMint: form.revokeMint, revokeUpdate: form.revokeUpdate, modifyCreator: form.modifyCreator };
  const total = lamportsToSol(coinFee(options));

  function handleFile(file: File | null) {
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) return setErrors((e) => ({ ...e, image: "PNG or JPG only" }));
    if (file.size > MAX_IMAGE) return setErrors((e) => ({ ...e, image: "Max 4MB" }));
    setErrors((e) => ({ ...e, image: undefined }));
    const reader = new FileReader();
    reader.onload = (e) => setForm((f) => ({ ...f, image: file, preview: String(e.target?.result ?? "") }));
    reader.readAsDataURL(file);
  }

  function validate(s: number) {
    const errs: Partial<Record<keyof Form, string>> = {};
    if (s === 1) {
      const name = form.name.trim();
      const sym = form.symbol.trim();
      if (!name) errs.name = "Required";
      else if (new TextEncoder().encode(name).length > MAX_NAME) errs.name = `Max ${MAX_NAME} characters`;
      if (!sym) errs.symbol = "Required";
      else if (!SYMBOL_ALLOWED.test(sym)) errs.symbol = "Letters and numbers only";
      if (!form.image) errs.image = "Required";
    }
    if (s === 2) {
      const d = Number(form.decimals);
      if (form.decimals === "" || !Number.isInteger(d) || d < 0 || d > 9) errs.decimals = "0–9";
      if (!/^\d+$/.test(form.supply) || BigInt(form.supply) === BigInt(0)) errs.supply = "Required";
      else if (BigInt(form.supply) * BigInt(10) ** BigInt(Number.isInteger(d) ? d : 0) > BigInt("18446744073709551615")) errs.supply = "Too large for these decimals";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const next = () => validate(step) && setStep((s) => s + 1);
  const prev = () => {
    setErrors({});
    setStep((s) => s - 1);
  };

  async function create() {
    if (!wallet.publicKey) {
      wallet.connect();
      toast("Connect your wallet to continue");
      return;
    }
    try {
      setStage("uploading");
      const res = await launchCoin(
        wallet,
        connection,
        {
          name: form.name,
          symbol: form.symbol,
          description: form.description,
          decimals: Number(form.decimals),
          supply: BigInt(form.supply),
          file: form.image,
          links: { website: form.website, twitter: form.twitter, telegram: form.telegram, discord: form.discord },
          creator: { name: form.creatorName, website: form.creatorWebsite },
          options,
        },
        setStage,
      );
      toast.success("Token created");
      setMint(res.mint);
    } catch (e) {
      toast.error(friendlyError(e));
    } finally {
      setStage(null);
    }
  }

  function reset() {
    setForm(INITIAL);
    setStep(1);
    setMint(null);
  }

  if (stage) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#212225]">
          <Loader2 size={24} className="animate-spin text-[#86efac]" />
        </div>
        <h3 className="mb-1.5 text-lg font-semibold text-[#fafafa]">Confirming Transaction</h3>
        <p className="text-sm text-[#696e77]">{STAGE_LABEL[stage]}</p>
        <p className="mt-2 text-xs text-[#696e77]">Minting your token on Solana. Slow RPC confirmation can take a little longer.</p>
        <div className="mt-6 flex justify-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#86efac]" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {mint && <LaunchSuccessModal mint={mint} onClose={reset} />}
      <StepIndicator step={step} />

      <div className="rounded-[16px] border border-[#212225] bg-[#18191b] p-6 sm:p-8">
        {step === 1 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Token Name <Req /></label>
                <input type="text" placeholder="Meme Coin" maxLength={MAX_NAME} value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls(errors.name)} />
                <Err msg={errors.name} />
              </div>
              <div>
                <label className={labelCls}>Token Symbol <Req /></label>
                <input
                  type="text"
                  placeholder="meme"
                  maxLength={MAX_SYMBOL}
                  value={form.symbol}
                  onChange={(e) => set("symbol", e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, MAX_SYMBOL))}
                  className={inputCls(errors.symbol)}
                />
                <Err msg={errors.symbol} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Token Image <Req /></label>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFile(e.dataTransfer.files[0] ?? null);
                }}
                className={`cursor-pointer rounded-[12px] border-2 border-dashed p-10 text-center transition-all duration-150 ${
                  dragOver ? "border-[#86efac] bg-[#86efac]/5" : errors.image ? "border-[#f87171] bg-[#111113]" : "border-[#272a2d] bg-[#111113] hover:border-[#363a3f]"
                }`}
              >
                {form.preview ? (
                  <div className="flex flex-col items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={form.preview} alt="preview" className="h-16 w-16 rounded-full border border-[#212225] object-cover" />
                    <p className="text-sm text-[#696e77]">{form.image?.name}</p>
                    <p className="text-xs text-[#363a3f]">Click to change</p>
                  </div>
                ) : (
                  <>
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#212225]">
                      <Upload size={18} className="text-[#696e77]" />
                    </div>
                    <p className="text-sm text-[#e4e4e7]">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="mt-1 text-xs text-[#363a3f]">PNG or JPG. Max 4MB.</p>
                  </>
                )}
              </div>
              <Err msg={errors.image} />
              <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
            </div>

            <div className="flex justify-end pt-1">
              <button type="button" onClick={next} className={primaryBtn}>
                Next <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Token Decimals <Req /></label>
                <input type="number" min="0" max="9" value={form.decimals} onChange={(e) => set("decimals", e.target.value)} className={inputCls(errors.decimals)} />
                <Err msg={errors.decimals} />
              </div>
              <div>
                <label className={labelCls}>Total Supply <Req /></label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1000000000"
                  value={form.supply}
                  onChange={(e) => set("supply", e.target.value.replace(/\D/g, "").slice(0, 15))}
                  className={inputCls(errors.supply)}
                />
                <Err msg={errors.supply} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Token Description</label>
              <textarea
                rows={5}
                placeholder="Enter token description"
                maxLength={1000}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className="w-full resize-none rounded-[12px] border border-[#212225] bg-[#18191b] px-3 py-2.5 text-sm text-[#fafafa] placeholder-[#363a3f] shadow-[0_1px_rgba(0,0,0,0.05)] outline-none transition-all duration-150 focus:border-[#696e77]"
              />
            </div>
            <div className="flex justify-between pt-1">
              <button type="button" onClick={prev} className={secondaryBtn}>
                <ArrowLeft size={15} /> Previous
              </button>
              <button type="button" onClick={next} className={primaryBtn}>
                Next <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              {(
                [
                  { key: "website", label: "Website", placeholder: "https://mymemecoin.com" },
                  { key: "twitter", label: "Twitter", placeholder: "https://x.com/…" },
                  { key: "telegram", label: "Telegram", placeholder: "https://t.me/…" },
                  { key: "discord", label: "Discord", placeholder: "https://discord.gg/…" },
                ] as const
              ).map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className={labelCls}>{label}</label>
                  <input type="url" placeholder={placeholder} value={form[key]} onChange={(e) => set(key, e.target.value)} className={inputCls()} />
                </div>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between py-4">
                <div className="pr-4">
                  <p className="text-sm font-semibold text-[#fafafa]">Modify Creator Information</p>
                  <p className="mt-0.5 text-xs text-[#696e77]">Add your own creator name and website to the token metadata.</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`text-xs transition-all duration-150 ${form.modifyCreator ? "font-bold text-[#86efac]" : "font-medium text-[#696e77]"}`}>
                    +{lamportsToSol(FEES.modifyCreator)} SOL
                  </span>
                  <Switch on={form.modifyCreator} onClick={() => set("modifyCreator", !form.modifyCreator)} label="Modify creator information" />
                </div>
              </div>
              {form.modifyCreator && (
                <div className="space-y-4 pb-1">
                  <div>
                    <label className={labelCls}>Creator Name</label>
                    <input type="text" placeholder="Your name or organization" maxLength={64} value={form.creatorName} onChange={(e) => set("creatorName", e.target.value)} className={inputCls()} />
                  </div>
                  <div>
                    <label className={labelCls}>Creator Website</label>
                    <input type="url" placeholder="https://mymemecoin.com" value={form.creatorWebsite} onChange={(e) => set("creatorWebsite", e.target.value)} className={inputCls()} />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  { key: "revokeFreeze", title: "Revoke Freeze", desc: "Freeze Authority allows you to freeze token of holders. Required for a liquidity pool.", fee: FEES.revokeFreeze },
                  { key: "revokeMint", title: "Revoke Mint", desc: "Mint Authority allows you to mint more supply of your token.", fee: FEES.revokeMint },
                  { key: "revokeUpdate", title: "Revoke Update", desc: "Update Authority allows you to update the token metadata.", fee: FEES.revokeUpdate },
                ] as const
              ).map(({ key, title, desc, fee }) => (
                <div
                  key={key}
                  onClick={() => set(key, !form[key])}
                  className={`cursor-pointer rounded-[12px] border p-4 transition-all duration-150 ${
                    form[key] ? "border-[#86efac]/40 bg-[#86efac]/5" : "border-[#212225] bg-[#111113] hover:border-[#272a2d]"
                  }`}
                >
                  <p className="mb-1.5 text-sm font-semibold text-[#fafafa]">{title}</p>
                  <p className="mb-4 text-xs leading-relaxed text-[#696e77]">{desc}</p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className={`text-xs transition-colors duration-150 ${form[key] ? "font-bold text-[#86efac]" : "font-medium text-[#696e77]"}`}>+{lamportsToSol(fee)} SOL</span>
                    <span
                      className={`rounded-[8px] px-2.5 py-1 text-center text-xs font-semibold transition-all duration-150 ${
                        form[key] ? "bg-[#86efac] text-[#052e16]" : "bg-[#212225] text-[#696e77]"
                      }`}
                    >
                      {form[key] ? "Selected" : "Select"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button type="button" onClick={prev} className={secondaryBtn}>
                <ArrowLeft size={15} /> Previous
              </button>
              <button
                type="button"
                onClick={create}
                className="h-10 rounded-[12px] bg-[#86efac] px-6 text-sm font-semibold text-[#052e16] transition-all duration-150 hover:bg-[#bbf7d0] active:translate-y-px"
              >
                {wallet.publicKey ? "Create Coin" : "Connect Wallet"}
              </button>
            </div>
            <p className="text-right text-xs text-[#696e77]">
              Total cost: <span className="font-semibold text-[#e4e4e7]">{total.toFixed(2)} SOL</span> + ≈0.02 SOL network rent
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
