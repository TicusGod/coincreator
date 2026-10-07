import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useEffect, useMemo, useState } from 'react';
import { PrivyProvider, useLogin, usePrivy, type PrivyClientConfig } from '@privy-io/react-auth';
import { toSolanaWalletConnectors, useSignTransaction, useWallets } from '@privy-io/react-auth/solana';
import { createDefaultRpcTransport, createSolanaRpcFromTransport, createSolanaRpcSubscriptions } from '@solana/kit';
import { env } from '../config/env';
import { API_PROXY_HEADER_NAME, API_PROXY_HEADER_VALUE } from '../services/apiProxy';
import { PrivyWalletAdapter, PrivyWalletName } from './PrivyWalletAdapter';

import '@solana/wallet-adapter-react-ui/styles.css';

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

/** Feeds Privy's session, wallet and signer into the wallet-adapter wallet. */
function PrivyBridge({ adapter }: { adapter: PrivyWalletAdapter }) {
  const { ready, authenticated, logout } = usePrivy();
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();
  const [cancelCount, setCancelCount] = useState(0);
  const { login } = useLogin({ onError: () => setCancelCount((c) => c + 1) });
  const wallet = authenticated ? wallets[0] ?? null : null;

  useEffect(() => {
    adapter.setState({
      ready,
      authenticated,
      address: wallet?.address ?? null,
      login: () => login(),
      logout,
      cancelCount,
      signTransaction: async (bytes) => {
        if (!wallet) throw new Error('Connect your wallet first');
        const { signedTransaction } = await signTransaction({ transaction: bytes, wallet, chain: env.isDevnet() ? 'solana:devnet' : 'solana:mainnet' });
        return signedTransaction;
      },
    });
  }, [adapter, ready, authenticated, wallet, login, logout, signTransaction, cancelCount]);

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

  const privyConfig = useMemo((): PrivyClientConfig => {
    const transport = createDefaultRpcTransport({ url: endpoint, headers: { [API_PROXY_HEADER_NAME]: API_PROXY_HEADER_VALUE } });
    return {
      loginMethodsAndOrder: { primary: ['email', 'phantom'], overflow: ['detected_solana_wallets', 'wallet_connect_qr_solana'] },
      appearance: {
        theme: 'dark',
        accentColor: '#86efac',
        logo: '/logo.svg',
        walletChainType: 'solana-only',
        walletList: ['phantom', 'detected_solana_wallets', 'wallet_connect_qr_solana'],
        landingHeader: 'Sign in to coincreator.fun',
      },
      embeddedWallets: { solana: { createOnLogin: 'users-without-wallets' }, ethereum: { createOnLogin: 'off' } },
      externalWallets: { solana: { connectors: toSolanaWalletConnectors() } },
      solana: {
        rpcs: {
          [env.isDevnet() ? 'solana:devnet' : 'solana:mainnet']: {
            rpc: createSolanaRpcFromTransport(transport),
            rpcSubscriptions: createSolanaRpcSubscriptions(env.isDevnet() ? 'wss://api.devnet.solana.com' : 'wss://api.mainnet-beta.solana.com'),
            blockExplorerUrl: 'https://solscan.io',
          },
        },
      },
    };
  }, [endpoint]);

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
          {PRIVY_APP_ID && <PrivyBridge adapter={privyAdapter} />}
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );

  if (!PRIVY_APP_ID) return tree;
  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={privyConfig}>
      {tree}
    </PrivyProvider>
  );
}
