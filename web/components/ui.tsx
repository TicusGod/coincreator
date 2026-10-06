// Small shared form primitives (one file: they are always used together).
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8 text-center">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {subtitle && <p className="mx-auto mt-3 max-w-xl text-sm text-muted">{subtitle}</p>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-card p-5 sm:p-6 ${className}`}>{children}</div>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-200">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

const inputCls = "w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-sm outline-none transition placeholder:text-zinc-600 focus:border-accent/60";

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={`${inputCls} ${p.className ?? ""}`} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={`${inputCls} min-h-24 ${p.className ?? ""}`} />;

export function Toggle({ checked, onChange, title, text, price, disabled }: {
  checked: boolean; onChange: (v: boolean) => void; title: string; text: string; price?: string; disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${checked ? "border-accent/50 bg-accent/5" : "border-line bg-bg"} disabled:opacity-60`}
    >
      <span className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition ${checked ? "bg-accent" : "bg-zinc-700"}`}>
        <span className={`h-4 w-4 rounded-full bg-white transition ${checked ? "translate-x-4" : ""}`} />
      </span>
      <span className="flex-1">
        <span className="flex items-center justify-between gap-2 text-sm font-medium">
          {title}
          {price && <span className="text-xs text-accent">{price}</span>}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-muted">{text}</span>
      </span>
    </button>
  );
}

export function Button({ children, loading, ...p }: { loading?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...p}
      disabled={p.disabled || loading}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-semibold text-bg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 ${p.className ?? ""}`}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" />}
      {children}
    </button>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error" | "success"; children: ReactNode }) {
  const c = { info: "border-line text-muted", error: "border-red-500/40 text-red-300 bg-red-500/5", success: "border-accent/40 text-accent bg-accent/5" }[tone];
  return <div className={`rounded-xl border px-4 py-3 text-sm ${c}`}>{children}</div>;
}
