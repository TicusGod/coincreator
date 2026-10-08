import type { ProxyOptions } from 'vite';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

const PUBLIC_MAINNET_RPC = 'https://api.mainnet-beta.solana.com';
const PUBLIC_DEVNET_RPC = 'https://api.devnet.solana.com';

function normalizePriceApiUrl(raw: string): string {
  const trimmed = raw.replace(/\/$/, '');
  return trimmed.replace(/\/price\/v2$/i, '/price/v3');
}

function proxyToAbsoluteUrl(targetUrl: string, extraHeaders: Record<string, string> = {}): ProxyOptions {
  const url = new URL(targetUrl);
  return {
    target: url.origin,
    changeOrigin: true,
    secure: true,
    headers: extraHeaders,
    rewrite: () => `${url.pathname}${url.search}`,
  };
}

// Vercel exposes system env vars to the build with the framework prefix (VITE_VERCEL_GIT_REPO_OWNER, commit
// author, deployment id…). env.ts reads import.meta.env by name, so Vite would inline every VITE_* var into the
// public bundle. Drop Vercel's so repo / author / deployment details never ship to browsers.
for (const key of Object.keys(process.env)) {
  if (key.startsWith('VITE_VERCEL_')) delete process.env[key];
}

export default defineConfig(({ mode }) => {
  const serverEnv = loadEnv(mode, process.cwd(), '');
  const devProxy: Record<string, string | ProxyOptions> = {};

  // The public mainnet RPC answers 403 to browser requests (any Origin header). Strip Origin/Referer like the
  // Vercel /api/rpc function does, so the dev proxy behaves the same as production.
  const stripBrowserHeaders: ProxyOptions['configure'] = (proxy) => {
    proxy.on('proxyReq', (proxyReq) => {
      proxyReq.removeHeader('origin');
      proxyReq.removeHeader('referer');
    });
  };
  devProxy['^/api/rpc/mainnet-beta$'] = { ...proxyToAbsoluteUrl(PUBLIC_MAINNET_RPC), configure: stripBrowserHeaders };
  devProxy['^/api/rpc/devnet$'] = { ...proxyToAbsoluteUrl(PUBLIC_DEVNET_RPC), configure: stripBrowserHeaders };
  if (typeof serverEnv.PINATA_JWT === 'string' && serverEnv.PINATA_JWT.trim()) {
    devProxy['^/api/pinata/file$'] = proxyToAbsoluteUrl('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      Authorization: `Bearer ${serverEnv.PINATA_JWT.trim()}`,
    });
    devProxy['^/api/pinata/json$'] = proxyToAbsoluteUrl('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      Authorization: `Bearer ${serverEnv.PINATA_JWT.trim()}`,
      'Content-Type': 'application/json',
    });
  }

  const priceApiUrl = new URL(normalizePriceApiUrl(serverEnv.PRICE_API || 'https://api.jup.ag/price/v3'));
  devProxy['^/api/price$'] = {
    target: priceApiUrl.origin,
    changeOrigin: true,
    secure: true,
    headers:
      typeof serverEnv.JUPITER_PRICE_API_KEY === 'string' && serverEnv.JUPITER_PRICE_API_KEY.trim()
        ? { 'x-api-key': serverEnv.JUPITER_PRICE_API_KEY.trim() }
        : {},
    rewrite: () => priceApiUrl.pathname,
  };

  return {
    plugins: [
      react(),
      nodePolyfills({
        globals: { Buffer: true, process: true },
        protocolImports: true,
      }),
    ],
    server: { proxy: devProxy },
    preview: { proxy: devProxy },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
  };
});
