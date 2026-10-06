"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Coins, DropletOff, Droplets, LayoutGrid, Mail, TrendingUp } from "lucide-react";
import { WalletButton } from "@/components/WalletButton";
import { TelegramLogo, XLogo } from "@/components/icons";
import { site } from "@/lib/site-config";



export const NAV = [
  { href: "/", label: "Create Coin", icon: Coins },
  { href: "/my-coins", label: "My Coins", icon: LayoutGrid },
  { href: "/create-liquidity", label: "Create Liquidity", icon: Droplets },
  { href: "/remove-liquidity", label: "Remove Liquidity", icon: DropletOff },
  { href: "/copy-trending", label: "Copy Trending", icon: TrendingUp },
] as const;

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
              className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-xl transition duration-300 ${
                active
                  ? "bg-brand text-white shadow-[0_10px_24px_-8px_rgba(245,75,0,.85),inset_0_1px_0_rgba(255,255,255,.35)]"
                  : "border border-white/[.07] bg-gradient-to-b from-white/[.06] to-white/[.01] text-muted shadow-[inset_0_1px_0_rgba(255,255,255,.06)] group-hover:border-ember/40 group-hover:text-sun group-hover:shadow-[0_0_18px_-6px_rgba(245,75,0,.7)]"
              }`}
            >
              <n.icon size={19} strokeWidth={1.9} />
            </span>
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Support contacts from site.config.json (email, telegram, x); renders only what is set. */
export function Contact() {
  const links = [
    site.email && { href: `mailto:${site.email}`, label: site.email, icon: <Mail size={17} strokeWidth={1.9} /> },
    site.telegram && { href: site.telegram, label: "Telegram", icon: <TelegramLogo /> },
    site.x && { href: site.x, label: "X", icon: <XLogo /> },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode }[];
  if (!links.length) return null;
  return (
    <div className="px-2 text-center">
      <p className="font-display text-[13px] font-semibold text-text">Need support? Contact us</p>
      <div className="mt-3 flex items-center justify-center gap-2">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            target={l.href.startsWith("mailto:") ? undefined : "_blank"}
            rel="noreferrer"
            title={l.label}
            aria-label={l.label}
            className="field grid h-9 w-9 place-items-center rounded-xl text-muted transition hover:border-ember/40 hover:text-text"
          >
            {l.icon}
          </a>
        ))}
      </div>
      {site.email && <a href={`mailto:${site.email}`} className="mt-2 block truncate text-[11px] text-dim hover:text-muted">{site.email}</a>}
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
        <div className="mt-auto"><Contact /></div>
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/[.05] bg-bg/55 backdrop-blur-xl lg:fixed lg:left-auto lg:right-0 lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
        <div className="flex h-16 items-center gap-3 px-4 lg:h-auto lg:px-10 lg:pt-6">
          <button
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="field grid h-10 w-10 place-items-center rounded-xl text-text lg:hidden"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h10M4 17h16" /></svg>
          </button>
          <div className="lg:hidden"><Logo /></div>
          <div className="ml-auto"><WalletButton /></div>
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
            <div className="mt-auto"><Contact /></div>
          </aside>
        </div>
      )}
    </>
  );
}
