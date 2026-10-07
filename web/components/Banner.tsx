// Top announcement strip (reference style). Text from site.config.json "banner"; {fee} = live create fee.
import { Zap } from "lucide-react";
import { FEES, lamportsToSol } from "@/lib/config";
import { site } from "@/lib/site-config";

export function Banner() {
  if (!site.banner) return null;
  return (
    <div className="announcement-banner">
      <Zap size={13} className="shrink-0 fill-current" />
      <span className="truncate">{site.banner.replace("{fee}", `${lamportsToSol(FEES.createCoin)} SOL`)}</span>
    </div>
  );
}
