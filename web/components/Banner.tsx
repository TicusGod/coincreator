// Announcement strip, reference style: static on desktop, marquee on mobile. Text from site.config.json "banner";
// {fee} is replaced by the live create-coin fee.
import { FEES, lamportsToSol } from "@/lib/config";
import { site } from "@/lib/site-config";

export function Banner() {
  if (!site.banner) return null;
  const text = `⚡ ${site.banner.replace("{fee}", `${lamportsToSol(FEES.createCoin)} SOL`)}`.toUpperCase();
  return (
    <div className="overflow-hidden border-b border-[#166534]/40 bg-[#166534]/30 py-2">
      <div className="mx-auto hidden max-w-6xl items-center justify-center px-4 sm:flex">
        <p className="text-center text-xs font-semibold tracking-wide text-[#86efac]">{text}</p>
      </div>
      <div className="flex items-center sm:hidden">
        <div className="animate-marquee flex whitespace-nowrap">
          <span className="px-8 text-xs font-semibold tracking-wide text-[#86efac]">{text}</span>
          <span className="px-8 text-xs font-semibold tracking-wide text-[#86efac]">{text}</span>
        </div>
      </div>
    </div>
  );
}
