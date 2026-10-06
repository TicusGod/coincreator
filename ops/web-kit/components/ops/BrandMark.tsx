// Logo when site.logo is set, otherwise the name. Never both (the logo replaces the wordmark).
import { site } from "@/lib/site-config";

export function BrandMark({ className = "", size = 32 }: { className?: string; size?: number }) {
  if (site.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={site.logo} alt={site.name} height={size} style={{ height: size, width: "auto" }} className={className} />;
  }
  return <span className={className}>{site.name}</span>;
}
