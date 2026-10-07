"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Copy, X } from "lucide-react";

/** Reference success modal after a launch: address + copy, Create Liquidity Pool, explorers. */
export function LaunchSuccessModal({ mint, onClose }: { mint: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="modal-backdrop-in absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-panel-in relative w-full max-w-sm rounded-[20px] border border-[#2a2b2f] bg-[#1a1b1e] p-6 shadow-2xl">
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 text-[#696e77] transition-colors duration-150 hover:text-[#fafafa]">
          <X size={18} />
        </button>
        <h2 className="mb-5 text-lg font-bold text-[#86efac]">Token Created Successfully!</h2>
        <p className="mb-2 text-sm font-semibold text-[#fafafa]">Token Address</p>
        <div className="mb-5 flex items-center gap-2 rounded-[12px] border border-[#212225] bg-[#111113] px-3 py-2.5">
          <p className="flex-1 truncate font-mono text-sm text-[#e4e4e7]">{mint}</p>
          <button
            onClick={() => navigator.clipboard?.writeText(mint).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })}
            aria-label="Copy address"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[#212225] text-[#b0b4ba] transition-all duration-150 hover:bg-[#272a2d] hover:text-[#fafafa]"
          >
            {copied ? <CheckCircle2 size={14} className="text-[#86efac]" /> : <Copy size={14} />}
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            href={`/liquidity?mint=${mint}`}
            onClick={onClose}
            className="flex h-11 w-full items-center justify-center rounded-[12px] bg-[#2563eb] text-sm font-semibold text-white transition-all duration-150 hover:bg-[#1d4ed8] active:translate-y-px"
          >
            Create Liquidity Pool
          </Link>
          <a
            href={`https://explorer.solana.com/address/${mint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-full items-center justify-center rounded-[12px] bg-[#212225] text-sm font-semibold text-[#e4e4e7] transition-all duration-150 hover:bg-[#272a2d] active:translate-y-px"
          >
            View on Explorer
          </a>
          <a
            href={`https://solscan.io/token/${mint}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-full items-center justify-center rounded-[12px] bg-[#212225] text-sm font-semibold text-[#e4e4e7] transition-all duration-150 hover:bg-[#272a2d] active:translate-y-px"
          >
            View on Solscan
          </a>
        </div>
      </div>
    </div>
  );
}
