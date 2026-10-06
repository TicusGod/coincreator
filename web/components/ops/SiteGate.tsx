// Wrap {children} in app/layout.tsx. status "paused" shows only the waiting page.
// data-site-status is what ops/site.sh verify greps on the live site: keep it.
import type { ReactNode } from "react";
import { site } from "@/lib/site-config";

export function SiteGate({ children, paused }: { children: ReactNode; paused?: ReactNode }) {
  if (site.status === "paused") {
    return (
      <div data-site-status="paused">
        {paused ?? (
          <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
            <p>{site.name} is taking a short break. Back soon.</p>
          </main>
        )}
      </div>
    );
  }
  return <div data-site-status={site.status} style={{ display: "contents" }}>{children}</div>;
}
