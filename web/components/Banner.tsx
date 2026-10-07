"use client";

// Announcement strip (reference wording). Driven by site.config.json "promo": shows the real promo price and the hours
// left, and disappears when the promo ends (the create fee then switches to the regular price in lib/config.ts).
import { useEffect, useState } from "react";
import { FEES, lamportsToSol, promoHoursLeft } from "@/lib/config";
import { site } from "@/lib/site-config";

export function Banner() {
  const [hours, setHours] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setHours(promoHoursLeft());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  if (hours === null) return <div className="announcement-banner" aria-hidden />;
  if (!site.banner || !site.promo || hours === 0) {
    return (
      <div className="announcement-banner">
        <span className="truncate">LAUNCH YOUR COIN FOR {lamportsToSol(FEES.createCoinRegular)} SOL · METEORA LIQUIDITY IN 1 CLICK</span>
      </div>
    );
  }
  const text = site.banner
    .replace("{fee}", `${lamportsToSol(FEES.createCoin)} SOL`)
    .replace("{regular}", `${lamportsToSol(FEES.createCoinRegular)} SOL`)
    .replace("{hours}", String(hours));
  return (
    <div className="announcement-banner">
      <span className="truncate">{text}</span>
    </div>
  );
}
