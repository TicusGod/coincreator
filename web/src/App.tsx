import { useWallet } from '@solana/wallet-adapter-react';
import { useCallback, useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import AnnouncementBanner from './components/AnnouncementBanner';
import Header from './components/Header';
import HeroBanner from './components/HeroBanner';
import TokenForm from './components/TokenForm';
import Liquidity from './components/Liquidity';
import CopyTrending from './components/CopyTrending';
import { useAppStore } from './stores/useAppStore';
import { resetRaydium } from './services/raydiumService';

type Page = 'create' | 'liquidity' | 'trending';

function WalletStoreSync() {
  const { publicKey, connected } = useWallet();
  const setCurrentWallet = useAppStore((s) => s.setCurrentWallet);

  useEffect(() => {
    setCurrentWallet(publicKey?.toBase58() ?? null);
  }, [publicKey, setCurrentWallet]);

  useEffect(() => {
    if (!connected) resetRaydium();
  }, [connected]);

  return null;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('create');
  const [liquidityInitialMint, setLiquidityInitialMint] = useState<string | null>(null);

  const clearLiquidityInitialMint = useCallback(() => setLiquidityInitialMint(null), []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [currentPage]);

  return (
    <div className="min-h-screen flex flex-col bg-[#111113] text-[#fafafa]">
      <WalletStoreSync />
      <Toaster position="bottom-right" toastOptions={{ duration: 5000 }} />
      <AnnouncementBanner />
      <Header currentPage={currentPage} onPageChange={setCurrentPage} />

      <main className="flex-1">
        {currentPage === 'create' ? (
          <>
            <HeroBanner />
            <section className="pb-16 px-4">
              <div className="max-w-2xl mx-auto">
                <TokenForm
                  onGoToLiquidity={(mint) => {
                    setLiquidityInitialMint(mint);
                    setCurrentPage('liquidity');
                  }}
                />
              </div>
            </section>
          </>
        ) : currentPage === 'liquidity' ? (
          <Liquidity
            initialSelectMint={liquidityInitialMint}
            onInitialSelectConsumed={clearLiquidityInitialMint}
          />
        ) : (
          <CopyTrending
            onGoToLiquidity={(mint) => {
              setLiquidityInitialMint(mint);
              setCurrentPage('liquidity');
            }}
          />
        )}
      </main>

      <footer className="py-6 text-center text-xs text-white">
        <a href="/terms" target="_blank" rel="noopener" className="mx-3 hover:underline">
          Terms &amp; Conditions
        </a>
        <a href="/privacy" target="_blank" rel="noopener" className="mx-3 hover:underline">
          Privacy Policy
        </a>
      </footer>
    </div>
  );
}
