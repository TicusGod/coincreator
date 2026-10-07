import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Suspense, lazy, useEffect, useMemo } from 'react';
import { env } from '../config/env';
import { API_PROXY_HEADER_NAME, API_PROXY_HEADER_VALUE } from '../services/apiProxy';
import { PrivyWalletAdapter, PrivyWalletName } from './PrivyWalletAdapter';

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

/** Keeps the Privy wallet selected so useWallet().connect() opens Privy's login. */
function SelectPrivy() {
  const { wallet, select } = useWallet();
  useEffect(() => {
    if (wallet?.adapter.name !== PrivyWalletName) select(PrivyWalletName);
  }, [wallet, select]);
  return null;
}

export default function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  const endpoint = env.getRpcUrl();
  const privyAdapter = useMemo(() => new PrivyWalletAdapter(), []);
  const wallets = useMemo(() => [privyAdapter], [privyAdapter]);



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
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletModalCloseWhenConnected />
          <SelectPrivy />
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
