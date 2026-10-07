import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, Coins, Flame, Mail, Menu, X, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSolanaWallet } from '../hooks/useSolanaWallet';

// Menu from the Bolt design (sidebar + floating wallet button), wired to this app's wallet and pages.
type Page = 'create' | 'liquidity' | 'trending';

interface HeaderProps {
  currentPage: Page;
  onPageChange: (page: Page) => void;
}

const navItems: { label: string; page: Page; icon: typeof Coins }[] = [
  { label: 'Token Creator', page: 'create', icon: Coins },
  { label: 'Liquidity', page: 'liquidity', icon: ArrowLeftRight },
  { label: 'Copy Trending', page: 'trending', icon: Flame },
];

export default function Header({ currentPage, onPageChange }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletMenuOpen, setWalletMenuOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);
  const { publicKey, connected, connect, disconnect, shortAddress } = useSolanaWallet();
  const navigate = (page: Page) => {
    onPageChange(page);
    setMenuOpen(false);
  };

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!popRef.current?.contains(e.target as Node)) setWalletMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const fullAddr = publicKey?.toBase58() ?? '';

  return (
    <aside className={`sidebar ${menuOpen ? 'sidebar-open' : ''}`}>
      <div className="brand-row">
        <div className="brand-mark"><Zap size={16} fill="currentColor" /></div>
        <span className="brand-name"><span style={{ color: '#fafafa' }}>coin</span><span style={{ color: '#86efac' }}>creator</span><span style={{ color: '#fafafa' }}>.fun</span></span>
        <button className="mobile-menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(({ label, page, icon: Icon }) => (
          <button key={page} onClick={() => navigate(page)} className={`nav-item ${currentPage === page ? 'active' : ''}`}>
            <span className="nav-icon"><Icon size={15} strokeWidth={1.7} /></span>
            <span className="nav-label">{label}{label === 'Copy Trending' && <span className="nav-hot">HOT</span>}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <p>Need support? Contact us</p>
        <a href="mailto:support@coincreator.fun" aria-label="Contact support"><Mail size={26} strokeWidth={1.5} /></a>
      </div>
      <div className="desktop-wallet-wrap" ref={popRef}>
        <button className="desktop-wallet" onClick={() => (connected && publicKey ? setWalletMenuOpen((o) => !o) : connect())}>
          {connected && publicKey ? shortAddress : 'Connect Wallet'}
        </button>
        {walletMenuOpen && connected && publicKey && (
          <div className="desktop-wallet-menu">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(fullAddr);
                  toast.success(`Address copied · ${shortAddress}`);
                  setWalletMenuOpen(false);
                } catch {
                  toast.error('Could not copy');
                }
              }}
            >
              Copy address
            </button>
            <button
              type="button"
              onClick={() => {
                setWalletMenuOpen(false);
                void disconnect();
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
