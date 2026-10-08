import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Suspense, lazy, useEffect, useMemo } from 'react';
import { env } from '../config/env';
import { API_PROXY_HEADER_NAME, API_PROXY_HEADER_VALUE } from '../services/apiProxy';
import { PrivyWalletName, privyAdapter } from './PrivyWalletAdapter';

import '@solana/wallet-adapter-react-ui/styles.css';

const PrivyLayer = lazy(() => import('./PrivyLayer'));

const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID as string | undefined;

/** Close the wallet *picker* after connect. Does not open the picker on load or when disconnected. */
function WalletModalCloseWhenConnected() {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();

  useEffect(() => {
    if (connected) setVisible(false);
  }, [connected, setVisible]);

  return null;
}

// Pre-select Privy as if restored from storage: wallet-adapter treats a restored selection as "not chosen by the
// user", so it never calls connect() (no automatic modal). Connecting only happens from the Connect button.
try {
  window.localStorage.setItem('walletName', JSON.stringify(PrivyWalletName));
} catch {
  /* private mode: the Connect button selects it instead */
}

/**
 * Silent session restore: if Privy already has a session, show the wallet as connected. Never opens a modal.
 * Also keeps wallet-adapter in sync when Privy re-attaches after it deselected the wallet (see PrivyWalletAdapter.resync).
 */
function RestorePrivySession() {
  const { wallet, connected, select } = useWallet();

  useEffect(() => {
    void privyAdapter.autoConnect().catch(() => {});
  }, []);

  useEffect(() => {
    const reselect = () => {
      if (privyAdapter.publicKey && wallet?.adapter !== privyAdapter) select(PrivyWalletName);
    };
    privyAdapter.on('connect', reselect);
    // After this commit's effects, so wallet-adapter is already listening when we re-announce.
    const t = setTimeout(() => {
      reselect();
      if (wallet?.adapter === privyAdapter && !connected) privyAdapter.resync();
    }, 0);
    return () => {
      clearTimeout(t);
      privyAdapter.off('connect', reselect);
    };
  }, [wallet, connected, select]);

  return null;
}

export default function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = env.getRpcUrl();
  const wallets = useMemo(() => [privyAdapter], []);



  const tree = (
    <ConnectionProvider
      endpoint={endpoint}
      config={{
        commitment: 'confirmed',
        httpHeaders: {
          [API_PROXY_HEADER_NAME]: API_PROXY_HEADER_VALUE,
        },
      }}
    >
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <WalletModalCloseWhenConnected />
          <RestorePrivySession />
          {PRIVY_APP_ID && (
            <Suspense fallback={null}>
              <PrivyLayer appId={PRIVY_APP_ID} adapter={privyAdapter} />
            </Suspense>
          )}
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );

  return tree;
}
