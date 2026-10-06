// Shared UI primitives (one file: they are always used together).
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function PageTitle({ eyebrow, title, accent, subtitle }: { eyebrow?: string; title: string; accent?: string; subtitle?: string }) {
  return (
    <div className="rise mb-10 text-center">
      {eyebrow && (
        <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-xs font-medium text-muted backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-brand shadow-[0_0_10px_2px_rgba(245,75,0,.6)]" />
          {eyebrow}
        </span>
      )}
      <h1 className="font-display text-[34px] font-bold leading-[1.1] tracking-tight sm:text-5xl">
        {title} {accent && <span className="text-brand">{accent}</span>}
      </h1>
      {subtitle && <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted">{subtitle}</p>}
    </div>
  );
}

export function Card({ children, className = "", highlight }: { children: ReactNode; className?: string; highlight?: boolean }) {
  return <div className={`glass rounded-[20px] p-5 sm:p-6 ${highlight ? "ring-brand" : ""} ${className}`}>{children}</div>;
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="font-display text-[15px] font-semibold tracking-tight">{children}</h2>
      {right}
    </div>
  );
}

export function Field({ label, hint, right, children }: { label: string; hint?: ReactNode; right?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between text-[13px] font-medium text-muted">
        {label}
        {right}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-dim">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-line bg-bg/60 px-3.5 py-3 text-[15px] text-text outline-none transition placeholder:text-dim hover:border-line-hi focus:border-ember/70 focus:bg-bg/80 focus:shadow-[0_0_0_4px_rgba(245,75,0,.12)]";

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`${inputCls} ${p.className ?? ""}`} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={`${inputCls} min-h-[112px] resize-none ${p.className ?? ""}`} />
);

export function Switch({ checked }: { checked: boolean }) {
  return (
    <span className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition ${checked ? "bg-brand" : "bg-line-hi"}`}>
      <span className={`h-5 w-5 rounded-full bg-white shadow-md transition-transform ${checked ? "translate-x-5" : ""}`} />
    </span>
  );
}

export function Toggle({ checked, onChange, title, text, price, badge }: {
  checked: boolean; onChange: (v: boolean) => void; title: string; text: string; price?: string; badge?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`group flex w-full items-start gap-3.5 rounded-2xl border p-4 text-left transition ${
        checked ? "ring-brand" : "border-line bg-bg/40 hover:border-line-hi"
      }`}
    >
      <span className="flex-1">
        <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          {title}
          {badge && <span className="rounded-md bg-ember/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ember">{badge}</span>}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-muted">{text}</span>
        {price && <span className={`mt-2 inline-block font-mono text-xs ${checked ? "text-sun" : "text-dim"}`}>{price}</span>}
      </span>
      <Switch checked={checked} />
    </button>
  );
}

export function Button({ children, loading, variant = "brand", size = "md", className = "", ...p }: {
  loading?: boolean; variant?: "brand" | "ghost"; size?: "md" | "lg";
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const v = variant === "brand" ? "btn-brand" : "border border-line bg-surface-2/70 text-text hover:border-line-hi hover:bg-surface-2";
  const s = size === "lg" ? "h-[52px] px-6 text-[15px] rounded-2xl" : "h-11 px-5 text-sm rounded-xl";
  return (
    <button
      {...p}
      disabled={p.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${v} ${s} ${className}`}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
      {children}
    </button>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  const c = {
    info: "border-line bg-surface/60 text-muted",
    error: "border-red-500/30 bg-red-500/[.07] text-red-300",
    success: "border-good/30 bg-good/[.07] text-good",
  }[tone];
  const icon = { info: "M12 8v.5M12 11v5", error: "M12 7v6M12 16.5v.5", success: "M8 12.5l2.5 2.5L16 9.5" }[tone];
  return (
    <div className={`rise flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${c}`}>
      <svg className="mt-px shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d={icon} />
      </svg>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function Segmented<T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: string; hint?: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-1 rounded-2xl border border-line bg-bg/50 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          type="button"
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={`rounded-xl px-2 py-2 text-sm font-semibold transition ${value === o.value ? "bg-surface-2 text-text shadow-[inset_0_1px_0_rgba(255,255,255,.07),0_4px_14px_-6px_rgba(0,0,0,.6)]" : "text-dim hover:text-muted"}`}
        >
          {o.label}
          {o.hint && <span className="block text-[10px] font-medium text-dim">{o.hint}</span>}
        </button>
      ))}
    </div>
  );
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export function SolLogo({ size = 24 }: { size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-black ring-1 ring-white/10" style={{ width: size, height: size }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 397 311">
        <defs>
          <linearGradient id="sol" x1="360" y1="-37" x2="141" y2="383" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00FFA3" />
            <stop offset="1" stopColor="#DC1FFF" />
          </linearGradient>
        </defs>
        <path fill="url(#sol)" d="M64.6 237.9a13 13 0 0 1 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7a13 13 0 0 1-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1zM64.6 3.8A13.4 13.4 0 0 1 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7a13 13 0 0 1-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1zM333.1 120.1a13 13 0 0 0-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7a13 13 0 0 0 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1z" />
      </svg>
    </span>
  );
}

/** Token picture, or a gradient monogram when there is none. */
export function TokenAvatar({ src, label, size = 40 }: { src?: string | null; label: string; size?: number }) {
  return (
    <span className="relative shrink-0 overflow-hidden rounded-full bg-surface-2 ring-1 ring-white/10" style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="grid h-full w-full place-items-center bg-brand font-display font-bold text-white" style={{ fontSize: size * 0.38 }}>
          {label.replace(/^\$/, "").slice(0, 1).toUpperCase() || "?"}
        </span>
      )}
    </span>
  );
}

export function SuccessPanel({ title, address, children }: { title: string; address: string; children: ReactNode }) {
  return (
    <Card highlight className="rise mx-auto max-w-lg text-center">
      <div className="relative mx-auto mb-5 grid h-16 w-16 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-ember/20" />
        <span className="relative grid h-16 w-16 place-items-center rounded-full bg-brand shadow-[0_10px_40px_-8px_rgba(245,75,0,.8)]">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </span>
      </div>
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <p className="mx-auto mt-3 max-w-sm break-all rounded-xl border border-line bg-bg/60 px-3 py-2 font-mono text-xs text-muted">{address}</p>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface-2/70 px-5 text-sm font-semibold transition hover:border-line-hi">
      {children}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M7 17 17 7M9 7h8v8" /></svg>
    </a>
  );
}
