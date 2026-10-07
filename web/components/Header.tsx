"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowLeftRight, Coins, Flame, LayoutGrid, Mail } from "lucide-react";
import { WalletButton } from "@/components/WalletButton";
import { TelegramLogo, XLogo } from "@/components/icons";
import { site } from "@/lib/site-config";

export const NAV = [
  { href: "/", label: "Token Creator", icon: Coins },
  { href: "/liquidity", label: "Liquidity", icon: ArrowLeftRight },
  { href: "/copy-trending", label: "Copy Trending", icon: Flame, badge: "HOT" },
  { href: "/my-coins", label: "My Coins", icon: LayoutGrid },
] as const;

export function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      {site.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={site.logo} alt="" width={34} height={34} className="h-[34px] w-[34px] drop-shadow-[0_6px_18px_rgba(245,75,0,.5)] transition group-hover:scale-105" />
      )}
      <span className="font-display text-[21px] font-extrabold tracking-tight">
        coin<span className="text-brand">creator</span>.fun
      </span>
    </Link>
  );
}

function NavItems({ onPick }: { onPick?: () => void }) {
  const path = usePathname();
  return (
    <nav className="grid gap-1">
      {NAV.map((n) => {
        const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onPick}
            className={`group relative flex items-center gap-3 rounded-2xl px-2.5 py-2 font-display text-[14px] font-bold transition ${
              active ? "bg-white/[.05] text-text shadow-[inset_0_1px_0_rgba(255,255,255,.05)]" : "text-muted hover:bg-white/[.03] hover:text-text"
            }`}
          >
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition ${
                active ? "bg-brand text-white shadow-[0_8px_20px_-8px_rgba(245,75,0,.85)]" : "border border-white/[.07] bg-white/[.03] text-muted group-hover:text-sun"
              }`}
            >
              <n.icon size={17} strokeWidth={2} />
            </span>
            <span className="relative">
              {n.label}
              {"badge" in n && (
                <span className="absolute -right-8 -top-2.5 rounded-md bg-gradient-to-r from-ember to-[#ff2d55] px-1.5 py-px text-[9px] font-extrabold tracking-wide text-white shadow-[0_4px_12px_-4px_rgba(255,45,85,.8)]">
                  {n.badge}
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/** Support contacts from site.config.json (email, telegram, x); renders only what is set. */
export function Contact() {
  const links = [
    site.email && { href: `mailto:${site.email}`, label: site.email, icon: <Mail size={19} strokeWidth={1.8} /> },
    site.telegram && { href: site.telegram, label: "Telegram", icon: <TelegramLogo size={18} /> },
    site.x && { href: site.x, label: "X", icon: <XLogo size={16} /> },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode }[];
  if (!links.length) return null;
  return (
    <div className="text-center">
      <p className="text-[12px] font-semibold text-muted">Need support? Contact us</p>
      <div className="mt-3 flex items-center justify-center gap-3">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            target={l.href.startsWith("mailto:") ? undefined : "_blank"}
            rel="noreferrer"
            title={l.label}
            aria-label={l.label}
            className="text-text/80 transition hover:-translate-y-0.5 hover:text-sun"
          >
            {l.icon}
          </a>
        ))}
      </div>
    </div>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <header className="sticky top-0 z-30 bg-[#0c0a16]/80 backdrop-blur-xl">
        <div className="flex h-[68px] items-center gap-3 px-4 lg:px-6">
          <button aria-label="Menu" onClick={() => setOpen(true)} className="field grid h-10 w-10 place-items-center rounded-xl text-text lg:hidden">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h10M4 17h16" /></svg>
          </button>
          <Logo />
          <div className="ml-auto"><WalletButton /></div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <aside className="rise absolute inset-y-0 left-0 flex w-[80%] max-w-[290px] flex-col bg-[#0e0c1a] px-3 py-5">
            <div className="px-2"><Logo /></div>
            <div className="mt-7"><NavItems onPick={() => setOpen(false)} /></div>
            <div className="mt-auto pb-2"><Contact /></div>
          </aside>
        </div>
      )}
    </>
  );
}

/** Desktop sidebar under the header (Orion / coincreator layout). */
export function Sidebar() {
  return (
    <aside className="sticky top-[68px] hidden h-[calc(100dvh-68px)] w-[230px] shrink-0 flex-col px-3 pb-6 pt-2 lg:flex">
      <NavItems />
      <div className="mt-auto"><Contact /></div>
    </aside>
  );
}
