"use client";
// Official CA chip. Renders nothing while site.ca is null. Put it in the navbar AND the hero.
import { useState } from "react";
import { site, explorerUrl, shortAddress } from "@/lib/site-config";

export function ContractAddress({ className = "", full = false }: { className?: string; full?: boolean }) {
  const [copied, setCopied] = useState(false);
  if (!site.ca) return null;
  const ca = site.ca;

  const copy = async () => {
    await navigator.clipboard.writeText(ca);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <span className={className} data-contract-address={ca}>
      <button type="button" onClick={copy} title="Copy contract address">
        {copied ? "Copied" : `CA ${full ? ca : shortAddress(ca)}`}
      </button>
      <a href={explorerUrl(ca)} target="_blank" rel="noreferrer" aria-label="View on explorer">↗</a>
    </span>
  );
}
