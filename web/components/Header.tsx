"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowLeftRight, Coins, Flame, LayoutGrid, Mail, Menu, X, Zap } from "lucide-react";
import { WalletButton } from "@/components/WalletButton";
import { TelegramLogo, XLogo } from "@/components/icons";
import { site } from "@/lib/site-config";

export const NAV = [
  { href: "/", label: "Token Creator", icon: Coins },
  { href: "/liquidity", label: "Liquidity", icon: ArrowLeftRight },
  { href: "/copy-trending", label: "Copy Trending", icon: Flame, hot: true },
  { href: "/my-coins", label: "My Coins", icon: LayoutGrid },
] as const;

function Brand() {
  return (
    <Link href="/" className="brand-row">
      <span className="brand-mark">
        <span className="brand-orbit" />
        <Zap size={15} className="fill-current" />
      </span>
      <span className="brand-name">
        coin<strong>creator</strong>.fun
      </span>
    </Link>
  );
}

function Contact() {
  const links = [
    site.email && { href: `mailto:${site.email}`, label: site.email, icon: <Mail size={20} strokeWidth={1.7} /> },
    site.telegram && { href: site.telegram, label: "Telegram", icon: <TelegramLogo size={18} /> },
    site.x && { href: site.x, label: "X", icon: <XLogo size={16} /> },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode }[];
  return (
    <div className="sidebar-footer">
      <p>Need support? Contact us</p>
      <div className="contact-links">
        {links.map((l) => (
          <a key={l.href} href={l.href} target={l.href.startsWith("mailto:") ? undefined : "_blank"} rel="noreferrer" title={l.label} aria-label={l.label}>
            {l.icon}
          </a>
        ))}
      </div>
    </div>
  );
}

/** Reference shell: fixed sidebar (top bar + drawer on mobile) and the floating wallet button. */
export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="flex items-center">
          <Brand />
          <button className="mobile-menu-button" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`nav-item ${active ? "active" : ""}`}>
                <span className="nav-icon"><n.icon size={15} strokeWidth={2} /></span>
                <span className="nav-label">
                  {n.label}
                  {"hot" in n && <span className="nav-hot">HOT</span>}
                </span>
              </Link>
            );
          })}
        </nav>
        <Contact />
      </aside>
      <div className="desktop-wallet"><WalletButton /></div>
    </>
  );
}
