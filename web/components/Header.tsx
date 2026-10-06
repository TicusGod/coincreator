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
  add: <path d="M12 3.5c3 3.6 5.5 6.6 5.5 9.6a5.5 5.5 0 0 1-11 0c0-3 2.5-6 5.5-9.6ZM12 11v5m-2.5-2.5h5" />,
  remove: <path d="M12 3.5c3 3.6 5.5 6.6 5.5 9.6a5.5 5.5 0 0 1-11 0c0-3 2.5-6 5.5-9.6ZM9.5 13.5h5M4 4l16 16" />,
  copy: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
};

export const NAV = [
  { href: "/", label: "Create Coin", icon: I.coin },
  { href: "/create-liquidity", label: "Create Liquidity", icon: I.add },
  { href: "/remove-liquidity", label: "Remove Liquidity", icon: I.remove },
  { href: "/copy-trending", label: "Copy Trending", icon: I.copy },
] as const;

const Svg = ({ children, size = 17 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      {site.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={site.logo} alt={site.name} width={38} height={38} className="h-[38px] w-[38px] drop-shadow-[0_6px_18px_rgba(245,75,0,.5)] transition group-hover:scale-105" />
      ) : (
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
        </span>
      )}
      <span className="font-display text-[19px] font-extrabold tracking-tight">
        {site.name}
        <span className="text-brand">.fun</span>
      </span>
    </Link>
  );
}

function NavItems({ onPick }: { onPick?: () => void }) {
  const path = usePathname();
  return (
    <nav className="grid gap-1.5">
      {NAV.map((n) => {
        const active = path === n.href;
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onPick}
            className={`group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 font-display text-[14px] font-semibold transition ${
              active ? "bg-gradient-to-r from-ember/15 via-violet/10 to-transparent text-text" : "text-muted hover:bg-white/[.03] hover:text-text"
            }`}
          >
            {active && <span className="absolute -left-4 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-brand" />}
            <span
              className={`grid h-9 w-9 place-items-center rounded-xl transition ${
                active ? "bg-brand text-white shadow-[0_8px_20px_-8px_rgba(245,75,0,.8)]" : "field text-muted group-hover:text-sun"
              }`}
            >
              <Svg>{n.icon}</Svg>
            </span>
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SideFooter() {
  return (
    <div className="card-3d-soft p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-text">
        <span className="h-2 w-2 animate-pulse rounded-full bg-good" />
        Solana mainnet
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-dim">
        Pools on <span className="font-semibold text-brand">Meteora DAMM v2</span>. Every transaction is signed in your own wallet.
      </p>
      {site.x && (
        <a href={site.x} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-[11px] font-semibold text-muted hover:text-text">
          Need support? Contact us →
        </a>
      )}
    </div>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] flex-col border-r border-white/[.06] bg-[#0e0c1a]/80 px-4 py-6 backdrop-blur-2xl lg:flex">
        <div className="px-2"><Logo /></div>
        <div className="mt-10 px-1 text-[10px] font-bold uppercase tracking-[.18em] text-dim">Tools</div>
        <div className="mt-3"><NavItems /></div>
        <div className="mt-auto"><SideFooter /></div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/[.05] bg-bg/55 backdrop-blur-xl lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
        <div className="flex h-16 items-center gap-3 px-4 lg:h-20 lg:px-10">
          <button
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="field grid h-10 w-10 place-items-center rounded-xl text-text lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h10M4 17h16" /></svg>
          </button>
          <div className="lg:hidden"><Logo /></div>
          <div className="ml-auto"><WalletMultiButton>Select Wallet</WalletMultiButton></div>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside className="rise absolute inset-y-0 left-0 flex w-[82%] max-w-[300px] flex-col border-r border-white/[.06] bg-[#0e0c1a] px-4 py-6">
            <div className="flex items-center justify-between px-2">
              <Logo />
              <button aria-label="Close" onClick={() => setOpen(false)} className="field grid h-9 w-9 place-items-center rounded-xl text-muted">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            <div className="mt-8"><NavItems onPick={() => setOpen(false)} /></div>
            <div className="mt-auto"><SideFooter /></div>
          </aside>
        </div>
      )}
    </>
  );
}
