"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import dynamic from "next/dynamic";
import { site } from "@/lib/site-config";

// Client-only: the wallet button reads window wallets.
const WalletMultiButton = dynamic(() => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton), {
  ssr: false,
  loading: () => <div className="h-10 w-[132px] rounded-xl skeleton" />,
});

const I = {
  coin: <path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v10m-3-7.5c0-1 1.3-1.8 3-1.8s3 .8 3 1.8-1.3 1.7-3 1.7-3 .8-3 1.8 1.3 1.8 3 1.8 3-.8 3-1.8" />,
  add: <path d="M4 17c3-1 4-6 8-6s5 5 8 6M12 3v5m-2.5-2.5h5" />,
  remove: <path d="M4 17c3-1 4-6 8-6s5 5 8 6M9.5 5.5h5" />,
  copy: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
};

export const NAV = [
  { href: "/", label: "Create Coin", icon: I.coin },
  { href: "/create-liquidity", label: "Create Liquidity", icon: I.add },
  { href: "/remove-liquidity", label: "Remove Liquidity", icon: I.remove },
  { href: "/copy-trending", label: "Copy Trending", icon: I.copy },
] as const;

const Svg = ({ children }: { children: React.ReactNode }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      {site.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={site.logo} alt={site.name} width={36} height={36} className="h-9 w-9 drop-shadow-[0_6px_18px_rgba(245,75,0,.45)] transition group-hover:scale-105" />
      ) : (
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
        </span>
      )}
      <span className="hidden font-display text-[18px] font-bold tracking-tight sm:inline">
        {site.name}
        <span className="text-brand">.fun</span>
      </span>
    </Link>
  );
}

export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40">
      <div className="border-b border-line/70 bg-bg/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <button
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface/80 text-text lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d={open ? "M6 6l12 12M18 6L6 18" : "M4 7h16M4 12h10M4 17h16"} />
            </svg>
          </button>
          <Logo />
          <nav className="mx-auto hidden items-center gap-1 rounded-2xl border border-line bg-surface/70 p-1 lg:flex">
            {NAV.map((n) => {
              const active = path === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                    active ? "bg-surface-2 text-text shadow-[inset_0_1px_0_rgba(255,255,255,.06)]" : "text-muted hover:text-text"
                  }`}
                >
                  <span className={active ? "text-ember" : ""}><Svg>{n.icon}</Svg></span>
                  {n.label}
                  {active && <span className="absolute inset-x-4 -bottom-[5px] h-px bg-brand" />}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto lg:ml-0">
            <WalletMultiButton>Select Wallet</WalletMultiButton>
          </div>
        </div>
      </div>
      {open && (
        <nav className="glass rise mx-3 mt-2 rounded-2xl p-2 lg:hidden">
          {NAV.map((n) => {
            const active = path === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${active ? "bg-surface-2 text-text" : "text-muted"}`}
              >
                <span className={`grid h-8 w-8 place-items-center rounded-lg ${active ? "bg-brand text-white" : "bg-surface-2"}`}>
                  <Svg>{n.icon}</Svg>
                </span>
                {n.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
