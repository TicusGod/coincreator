"use client";

import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";

// Wallet Standard wallets (Phantom, Solflare, Backpack…) register themselves; no adapter list needed.
export function Providers({ children }: { children: ReactNode }) {
  const endpoint = useMemo(() => (typeof window === "undefined" ? "http://localhost/api/rpc" : `${window.location.origin}/api/rpc`), []);
  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
