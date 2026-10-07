"use client";

import { useEffect, useRef, useState } from "react";
import { useAppWallet } from "@/lib/client/wallet";
import { toast } from "@/components/Toaster";

/** Reference wallet control: green "Connect Wallet", then a short-address pill with Copy / Disconnect. */
export function WalletButton() {
  const w = useAppWallet();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (!w.ready) return <div className="skeleton h-9 w-[120px] rounded-[12px]" />;

  if (!w.publicKey) {
    return (
      <button
        onClick={w.connect}
        className="h-9 select-none rounded-[12px] bg-[#86efac] px-4 text-sm font-semibold text-[#052e16] transition-all duration-150 hover:bg-[#bbf7d0] active:translate-y-px"
      >
        Connect Wallet
      </button>
    );
  }

  const addr = w.publicKey.toBase58();
  const short = `${addr.slice(0, 4)}…${addr.slice(-4)}`;
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded-[12px] border border-[#272a2d] bg-[#212225] px-3 text-sm font-medium text-[#fafafa] transition-all duration-150 hover:bg-[#272a2d]"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[#86efac]" />
        {short}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-[12px] border border-[#272a2d] bg-[#18191b] py-1 shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
          <button
            type="button"
            className="w-full px-4 py-3 text-left text-sm font-bold text-[#fafafa] transition-colors hover:bg-[#212225]"
            onClick={() =>
              navigator.clipboard
                ?.writeText(addr)
                .then(() => toast.success(`Address copied · ${short}`))
                .catch(() => toast.error("Could not copy"))
                .finally(() => setOpen(false))
            }
          >
            Copy address
          </button>
          <button
            type="button"
            className="w-full px-4 py-3 text-left text-sm font-bold text-[#fafafa] transition-colors hover:bg-[#212225]"
            onClick={() => {
              setOpen(false);
              void w.disconnect();
            }}
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
