"use client";

/**
 * One wallet API for the whole app. With NEXT_PUBLIC_PRIVY_APP_ID: Privy (email → embedded Solana wallet,
 * or Phantom/Solflare/Backpack). Without it: the Solana wallet-adapter modal, so local previews still work.
 * Components only use `useAppWallet()`.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { PublicKey, Transaction } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { usePrivy } from "@privy-io/react-auth";
import { useSignTransaction, useWallets } from "@privy-io/react-auth/solana";

export interface AppWallet {
  ready: boolean;
  publicKey: PublicKey | null;
  /** "email" for a Privy embedded wallet, else the wallet's name. */
  label: string | null;
  connect: () => void;
  disconnect: () => Promise<void>;
  /** Signs a transaction that may already carry partial signatures (mint / position keypairs). */
  sign: (tx: Transaction) => Promise<Transaction>;
}

const Ctx = createContext<AppWallet | null>(null);

export function useAppWallet(): AppWallet {
  const w = useContext(Ctx);
  if (!w) throw new Error("useAppWallet outside WalletBridge");
  return w;
}

const unsigned = (tx: Transaction) => tx.serialize({ requireAllSignatures: false, verifySignatures: false });

export function PrivyBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();
  const wallet = authenticated ? wallets[0] ?? null : null;

  const value = useMemo<AppWallet>(
    () => ({
      ready,
      publicKey: wallet ? new PublicKey(wallet.address) : null,
      label: wallet ? (wallet.standardWallet?.name === "Privy" ? "email" : wallet.standardWallet?.name ?? "wallet") : null,
      connect: () => login(),
      disconnect: () => logout(),
      sign: async (tx) => {
        if (!wallet) throw new Error("Connect your wallet first");
        const { signedTransaction } = await signTransaction({ transaction: unsigned(tx), wallet, chain: "solana:mainnet" });
        return Transaction.from(signedTransaction);
      },
    }),
    [ready, wallet, login, logout, signTransaction],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function AdapterBridge({ children }: { children: ReactNode }) {
  const w = useWallet();
  const { setVisible } = useWalletModal();

  const value = useMemo<AppWallet>(
    () => ({
      ready: true,
      publicKey: w.publicKey,
      label: w.wallet?.adapter.name ?? null,
      connect: () => setVisible(true),
      disconnect: () => w.disconnect(),
      sign: async (tx) => {
        if (!w.signTransaction) throw new Error("This wallet cannot sign transactions");
        return w.signTransaction(tx);
      },
    }),
    [w, setVisible],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
