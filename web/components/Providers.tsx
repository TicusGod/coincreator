"use client";

import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PrivyProvider, type PrivyClientConfig } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { AdapterBridge, PrivyBridge } from "@/lib/client/wallet";
import { site } from "@/lib/site-config";
import "@solana/wallet-adapter-react-ui/styles.css";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

function privyConfig(rpcUrl: string): PrivyClientConfig {
  return {
    loginMethods: ["email", "wallet"],
    loginMethodsAndOrder: { primary: ["email", "phantom"], overflow: ["detected_solana_wallets", "wallet_connect_qr_solana"] },
    appearance: {
      theme: "dark",
      accentColor: "#f54b00",
      logo: site.logo ?? undefined,
      walletChainType: "solana-only",
      walletList: ["phantom", "detected_solana_wallets", "wallet_connect_qr_solana"],
      landingHeader: `Sign in to ${site.name}`,
    },
    embeddedWallets: { solana: { createOnLogin: "users-without-wallets" }, ethereum: { createOnLogin: "off" } },
    externalWallets: { solana: { connectors: toSolanaWalletConnectors() } },
    solana: {
      rpcs: {
        "solana:mainnet": {
          rpc: createSolanaRpc(rpcUrl),
          // We only ask Privy to sign; sending and confirming go through our own RPC proxy.
          rpcSubscriptions: createSolanaRpcSubscriptions("wss://api.mainnet-beta.solana.com"),
          blockExplorerUrl: "https://solscan.io",
        },
      },
    },
  };
}

// The keyed Helius URL stays server-side behind /api/rpc.
export function Providers({ children }: { children: ReactNode }) {
  const endpoint = useMemo(() => (typeof window === "undefined" ? "http://localhost/api/rpc" : `${window.location.origin}/api/rpc`), []);
  const config = useMemo(() => privyConfig(endpoint), [endpoint]);

  if (PRIVY_APP_ID) {
    return (
      <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
        <PrivyProvider appId={PRIVY_APP_ID} config={config}>
          <PrivyBridge>{children}</PrivyBridge>
        </PrivyProvider>
      </ConnectionProvider>
    );
  }
  return (
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          <AdapterBridge>{children}</AdapterBridge>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
