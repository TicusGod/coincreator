// Top announcement strip. Text comes from site.config.json "banner"; {fee} is replaced by the live create fee.
import { Zap } from "lucide-react";
import { FEES, lamportsToSol } from "@/lib/config";
import { site } from "@/lib/site-config";

export function Banner() {
  if (!site.banner) return null;
  const text = site.banner.replace("{fee}", `${lamportsToSol(FEES.createCoin)} SOL`);
  return (
    <div className="relative z-40 overflow-hidden border-b border-white/[.06] bg-gradient-to-r from-ember/20 via-[#1a1030] to-violet/20">
      <div className="mx-auto flex h-9 max-w-[1600px] items-center justify-center gap-2 px-4 text-center font-display text-[11px] font-extrabold uppercase tracking-[.08em] sm:text-[12px]">
        <Zap size={13} className="shrink-0 fill-sun text-sun" />
        <span className="truncate text-brand">{text}</span>
      </div>
    </div>
  );
}
