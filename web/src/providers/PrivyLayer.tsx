// Privy, loaded lazily so the site paints before Privy's ~2.7 MB bundle arrives.
// It only feeds the wallet-adapter wallet; the Privy modal renders in its own portal.
import { useEffect, useMemo, useState } from 'react';
import { PrivyProvider, useLogin, usePrivy, type PrivyClientConfig } from '@privy-io/react-auth';
import { toSolanaWalletConnectors, useSignAndSendTransaction, useSignTransaction, useWallets } from '@privy-io/react-auth/solana';
import { createDefaultRpcTransport, createSolanaRpcFromTransport, createSolanaRpcSubscriptions } from '@solana/kit';
import { env } from '../config/env';
import { API_PROXY_HEADER_NAME, API_PROXY_HEADER_VALUE } from '../services/apiProxy';
import type { PrivyWalletAdapter } from './PrivyWalletAdapter';

/** Feeds Privy's session, wallet and signer into the wallet-adapter wallet. */
function PrivyBridge({ adapter }: { adapter: PrivyWalletAdapter }) {
  const { ready, authenticated, logout } = usePrivy();
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();
  const { signAndSendTransaction } = useSignAndSendTransaction();
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
      signAndSendTransaction: async (bytes, options) => {
        if (!wallet) throw new Error('Connect your wallet first');
        const { signature } = await signAndSendTransaction({
          transaction: bytes,
          wallet,
          chain: env.isDevnet() ? 'solana:devnet' : 'solana:mainnet',
          options,
        });
        return signature;
      },
    });
  }, [adapter, ready, authenticated, wallet, login, logout, signTransaction, signAndSendTransaction, cancelCount]);

  return null;
}

export default function PrivyLayer({ appId, adapter }: { appId: string; adapter: PrivyWalletAdapter }) {
  const endpoint = env.getRpcUrl();
  const privyConfig = useMemo((): PrivyClientConfig => {
    const transport = createDefaultRpcTransport({ url: endpoint, headers: { [API_PROXY_HEADER_NAME]: API_PROXY_HEADER_VALUE } });
    return {
      loginMethodsAndOrder: {
        primary: ['phantom', 'solflare', 'backpack', 'jupiter'],
        overflow: ['okx_wallet', 'bitget_wallet', 'coinbase_wallet', 'detected_solana_wallets', 'wallet_connect_qr_solana'],
      },
      appearance: {
        theme: 'dark',
        accentColor: '#86efac',
        logo: '/logo.svg',
        walletChainType: 'solana-only',
        walletList: ['phantom', 'solflare', 'backpack', 'jupiter', 'okx_wallet', 'bitget_wallet', 'coinbase_wallet', 'detected_solana_wallets', 'wallet_connect_qr_solana'],
        landingHeader: 'Sign in to coincreator.fun',
      },
      embeddedWallets: { solana: { createOnLogin: 'off' }, ethereum: { createOnLogin: 'off' } },
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

  return (
    <PrivyProvider appId={appId} config={privyConfig}>
      <PrivyBridge adapter={adapter} />
    </PrivyProvider>
  );
}
