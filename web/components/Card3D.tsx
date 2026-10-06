"use client";

import { useRef, type ReactNode } from "react";

/** Glowing gradient-rim card. `tilt` adds a small perspective tilt toward the cursor (mouse only). */
export function Card3D({ children, className = "", tilt = 0 }: { children: ReactNode; className?: string; tilt?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  function move(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    el.style.setProperty("--glow", "1");
    if (tilt) {
      el.style.setProperty("--rx", `${(0.5 - y) * tilt}deg`);
      el.style.setProperty("--ry", `${(x - 0.5) * tilt}deg`);
    }
  }
  function leave() {
    const el = ref.current;
    if (!el) return;
    for (const v of ["--rx", "--ry"]) el.style.setProperty(v, "0deg");
    el.style.setProperty("--glow", ".6");
  }

  return (
    <div ref={ref} onPointerMove={move} onPointerLeave={leave} className={`card-3d ${className}`}>
      {children}
    </div>
  );
}
