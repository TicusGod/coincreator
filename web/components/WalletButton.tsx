"use client";

import { useEffect, useRef, useState } from "react";
import { useAppWallet } from "@/lib/client/wallet";

export function WalletButton() {
  const w = useAppWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!w.ready) return <div className="skeleton h-10 w-[132px] rounded-xl" />;

  if (!w.publicKey) {
    return (
      <button onClick={w.connect} className="btn-brand h-10 rounded-xl px-4 font-display text-sm font-bold transition active:scale-[.98]">
        Connect Wallet
      </button>
    );
  }

  const addr = w.publicKey.toBase58();
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="field flex h-10 items-center gap-2 rounded-xl pl-2 pr-3 text-sm font-semibold transition hover:border-ember/40">
        <span className="h-6 w-6 rounded-lg bg-brand" />
        <span className="font-mono">{addr.slice(0, 4)}…{addr.slice(-4)}</span>
        <svg className={`text-muted transition ${open ? "rotate-180" : ""}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      {open && (
        <div className="card-3d-soft rise absolute right-0 top-12 z-50 w-56 p-1.5">
          {w.label && <div className="px-3 py-2 text-[11px] uppercase tracking-wider text-dim">Connected with {w.label}</div>}
          <button
            onClick={() => navigator.clipboard?.writeText(addr).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200); })}
            className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/[.05]"
          >
            {copied ? "Copied ✓" : "Copy address"}
          </button>
          <a href={`https://solscan.io/account/${addr}`} target="_blank" rel="noreferrer" className="block rounded-lg px-3 py-2 text-sm hover:bg-white/[.05]">
            View on Solscan
          </a>
          <button onClick={() => { setOpen(false); void w.disconnect(); }} className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10">
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
