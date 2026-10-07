"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { WalletButton } from "@/components/WalletButton";

export const NAV = [
  { href: "/", label: "Create Coin" },
  { href: "/liquidity", label: "Liquidity" },
  { href: "/copy-trending", label: "Copy Trending", hot: true },
  { href: "/my-coins", label: "My Coins" },
] as const;

const Hot = ({ floating }: { floating?: boolean }) => (
  <span
    className={`${floating ? "absolute -right-1 -top-1.5" : ""} rounded-[2px] bg-[#ef4444] px-1 py-px text-[9px] font-bold uppercase leading-none tracking-wide text-white`}
  >
    hot
  </span>
);

/** Reference header: logo, centred tabs, wallet + hamburger on mobile. */
export function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <header className="sticky top-0 z-50 border-b border-[#212225] bg-[#111113]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Home">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[10px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="" width={44} height={44} className="h-full w-full object-contain" />
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`relative flex h-8 items-center rounded-[10px] px-3 text-sm font-medium transition-all duration-150 ${
                isActive(n.href) ? "bg-[#212225] text-[#fafafa]" : "text-[#b0b4ba] hover:bg-[#212225] hover:text-[#fafafa]"
              }`}
            >
              {n.label}
              {"hot" in n && <Hot floating />}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <WalletButton />
          <button
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[#b0b4ba] transition-all duration-150 hover:bg-[#212225] hover:text-[#fafafa] md:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-1 border-t border-[#212225] bg-[#111113] px-4 py-3 md:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={`flex h-10 items-center gap-2 rounded-[10px] px-3 text-left text-sm font-medium transition-all duration-150 ${
                isActive(n.href) ? "bg-[#212225] text-[#fafafa]" : "text-[#b0b4ba] hover:bg-[#212225] hover:text-[#fafafa]"
              }`}
            >
              {n.label}
              {"hot" in n && <Hot />}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
