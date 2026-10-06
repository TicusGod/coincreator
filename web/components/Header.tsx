"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import dynamic from "next/dynamic";
import { BrandMark } from "@/components/ops/BrandMark";

// Client-only: the wallet button reads window wallets.
const WalletMultiButton = dynamic(() => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton), { ssr: false });

export const NAV = [
  { href: "/", label: "Create Coin" },
  { href: "/create-liquidity", label: "Create Liquidity" },
  { href: "/remove-liquidity", label: "Remove Liquidity" },
  { href: "/copy-trending", label: "Copy Trending" },
] as const;

export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <button
          aria-label="Menu"
          onClick={() => setOpen((o) => !o)}
          className="grid h-10 w-10 place-items-center rounded-[10px] bg-accent/15 text-accent md:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h16M4 17h16"} />
          </svg>
        </button>
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-bg">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
          </span>
          <BrandMark className="hidden uppercase sm:inline" />
        </Link>
        <nav className="mx-auto hidden items-center gap-1 rounded-full border border-line bg-card p-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-full px-4 py-1.5 text-sm transition ${path === n.href ? "bg-accent/15 text-accent" : "text-muted hover:text-white"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto md:ml-0">
          <WalletMultiButton>Select Wallet</WalletMultiButton>
        </div>
      </div>
      {open && (
        <nav className="border-t border-line px-4 py-3 md:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-2 py-3 text-sm ${path === n.href ? "text-accent" : "text-zinc-300"}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${path === n.href ? "bg-accent" : "bg-zinc-600"}`} />
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
