"use client";

// Liquidity page, copied from the owner's coincreate reference: pick a wallet token, pair it with SOL on Meteora,
// then manage "Your Pools" (claim fees, remove 25/50/75/100 %).
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Copy, Minus, RefreshCw, X } from "lucide-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { buildClaimFeesTx, buildCreatePoolTx, buildRemoveTx, listPositions, type UserPosition } from "@/lib/chain/meteora";
import { listWalletTokens, type WalletToken } from "@/lib/chain/coins";
import { FEES, lamportsToSol } from "@/lib/config";
import { useAppWallet } from "@/lib/client/wallet";
import { friendlyError, sendAndConfirm } from "@/lib/client/send";
import { metadataImage } from "@/lib/client/token-image";
import { toast } from "@/components/Toaster";

const SWAP_FEE_BPS = 100; // 1 %, as the reference
const LP_PERCENTAGES = [25, 50, 75, 100];
const SOL_RESERVE = 0.05; // left for fees + rent when pressing Max

const shortMint = (m: string, a = 4, b = 4) => `${m.slice(0, a)}…${m.slice(-b)}`;
const fmtInput = (n: number) => (n > 0 ? String(+n.toFixed(6)) : "");
const fmt = (n: number, d = 4) => n.toLocaleString("en-US", { maximumFractionDigits: d });

function useImage(uri: string | undefined) {
  const [img, setImg] = useState<string | null>(null);
  useEffect(() => {
    if (!uri) return;
    let alive = true;
    metadataImage(uri).then((i) => alive && setImg(i));
    return () => {
      alive = false;
    };
  }, [uri]);
  return uri ? img : null;
}

function TokenAvatar({ symbol, uri, size = "w-6 h-6", text = "text-[10px]" }: { symbol: string; uri?: string; size?: string; text?: string }) {
  const img = useImage(uri);
  return img ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={img} alt="" className={`${size} shrink-0 rounded-full border border-[#212225] object-cover`} />
  ) : (
    <span className={`${size} ${text} flex shrink-0 items-center justify-center rounded-full border border-[#212225] bg-[#212225] font-bold text-[#86efac]`}>
      {symbol.slice(0, 1).toUpperCase()}
    </span>
  );
}

// eslint-disable-next-line @next/next/no-img-element
const SolIcon = ({ size = "w-5 h-5" }: { size?: string }) => <img src="/sol.png" alt="SOL" className={`${size} shrink-0 rounded-full`} />;

const inputRow = "flex items-center gap-2 bg-[#111113] border border-[#212225] rounded-[12px] px-3 h-11";
const pctBtn = "text-[10px] font-bold text-[#86efac] hover:text-[#bbf7d0] px-1 transition-colors shrink-0";

function RemoveModal({ p, onClose, onDone }: { p: UserPosition; onClose: () => void; onDone: () => void }) {
  const { connection } = useConnection();
  const wallet = useAppWallet();
  const [selected, setSelected] = useState(100);
  const [busy, setBusy] = useState(false);
  const canRemove = !p.locked && selected > 0;

  async function run() {
    if (!wallet.publicKey) return wallet.connect();
    setBusy(true);
    const t = toast.loading("Removing liquidity…");
    try {
      await sendAndConfirm(wallet, connection, await buildRemoveTx(connection, wallet.publicKey, p, selected));
      toast.success(`Removed ${selected}% of your liquidity`, { id: t });
      onDone();
    } catch (e) {
      toast.error(friendlyError(e), { id: t });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="modal-backdrop-in absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="modal-panel-in relative mx-4 w-full max-w-sm rounded-[20px] border border-[#212225] bg-[#18191b] p-7 shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-[8px] text-[#696e77] transition-all duration-150 hover:bg-[#212225] hover:text-[#fafafa]">
          <X size={16} />
        </button>
        <h2 className="mb-5 text-xl font-bold text-[#fafafa]">Remove Liquidity</h2>
        {p.locked ? (
          <p className="mb-5 text-sm text-[#b0b4ba]">This position is locked forever. Swap fees can still be claimed.</p>
        ) : (
          <>
            <div className="mb-5 flex gap-2">
              {LP_PERCENTAGES.map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setSelected(pct)}
                  className={`h-9 flex-1 rounded-[8px] text-sm font-semibold transition-all duration-150 ${
                    selected === pct ? "bg-[#86efac] text-[#052e16]" : "bg-[#212225] text-[#b0b4ba] hover:bg-[#272a2d] hover:text-[#fafafa]"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <div className="relative mb-5 flex h-6 items-center">
              <div className="absolute inset-x-0 h-1.5 overflow-hidden rounded-full bg-[#212225]">
                <div className="absolute left-0 top-0 h-full rounded-full bg-[#86efac]" style={{ width: `${selected}%` }} />
              </div>
              <div className="pointer-events-none absolute z-0 h-3 w-3 rounded-full border-2 border-white bg-[#86efac] shadow" style={{ left: `calc(${selected}% - 6px)` }} />
              <input type="range" min={1} max={100} value={selected} onChange={(e) => setSelected(Number(e.target.value))} className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" aria-label="Percentage" />
            </div>
            <p className="mb-5 text-sm font-semibold text-[#e4e4e7]">Remove {selected}% of your liquidity</p>
          </>
        )}
        <button
          type="button"
          onClick={() => void run()}
          disabled={!canRemove || busy}
          className={`h-11 w-full rounded-[10px] text-sm font-bold transition-all duration-150 ${
            canRemove && !busy ? "cursor-pointer bg-[#ef4444] text-white hover:bg-[#dc2626] active:translate-y-px" : "cursor-not-allowed bg-[#ef4444]/30 text-white/40"
          }`}
        >
          {busy ? "Removing…" : "Remove Liquidity"}
        </button>
        <p className="mt-3 text-center text-xs text-[#696e77]">You must have {lamportsToSol(FEES.removeLiquidity)} SOL for the platform fee plus network costs.</p>
      </div>
    </div>
  );
}

function PoolRow({ p, onRemove, onClaimed }: { p: UserPosition; onRemove: () => void; onClaimed: () => void }) {
  const { connection } = useConnection();
  const wallet = useAppWallet();
  const [claiming, setClaiming] = useState(false);
  const value = Number(p.outSol) * 2; // full-range constant product: both sides hold the same value

  async function claim() {
    if (!wallet.publicKey) return wallet.connect();
    setClaiming(true);
    const t = toast.loading("Claiming fees…");
    try {
      await sendAndConfirm(wallet, connection, await buildClaimFeesTx(connection, wallet.publicKey, p));
      toast.success(`${p.feeSol} SOL of fees claimed`, { id: t });
      onClaimed();
    } catch (e) {
      toast.error(friendlyError(e), { id: t });
    } finally {
      setClaiming(false);
    }
  }

  const pool = p.pool.toBase58();
  return (
    <div className="rounded-[16px] border border-[#212225] bg-[#18191b] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 -space-x-2">
            <TokenAvatar symbol={p.symbol} uri={p.uri} size="w-9 h-9" text="text-[11px]" />
            <SolIcon size="w-9 h-9" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-[#fafafa]">{p.symbol}/SOL</p>
            <p className="truncate font-mono text-xs text-[#696e77]">
              {shortMint(p.tokenMint.toBase58())}-So11…1112
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {p.hasFees && (
            <button
              type="button"
              onClick={() => void claim()}
              disabled={claiming}
              className="flex h-8 items-center rounded-[8px] bg-[#86efac] px-3 text-xs font-semibold text-[#052e16] transition-colors hover:bg-[#bbf7d0] disabled:opacity-50"
            >
              {claiming ? "Claiming…" : `Claim ${p.feeSol} SOL`}
            </button>
          )}
          <a
            href={`https://dexscreener.com/solana/${pool}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 items-center rounded-[8px] border border-[#86efac] px-3 text-xs font-semibold text-[#86efac] transition-colors hover:bg-[#86efac]/10"
          >
            View on Dexscreener
          </a>
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove liquidity"
            title={p.locked ? "Locked forever" : "Remove liquidity"}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#ef4444] transition-colors hover:bg-[#dc2626]"
          >
            <Minus size={14} className="text-white" />
          </button>
        </div>
      </div>

      <p className="mb-4 break-all text-xs text-[#696e77]">
        Pool ID: <span className="font-mono font-semibold text-[#e4e4e7]">{pool}</span>
      </p>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-[12px] border border-[#212225] bg-[#111113] p-3">
          <p className="mb-1 text-xs text-[#696e77]">Pooled SOL</p>
          <div className="flex items-center gap-1.5">
            <SolIcon size="w-4 h-4" />
            <span className="text-sm font-bold text-[#fafafa]">{fmt(Number(p.outSol))}</span>
          </div>
        </div>
        <div className="rounded-[12px] border border-[#212225] bg-[#111113] p-3">
          <p className="mb-1 truncate text-xs text-[#696e77]">Pooled {p.symbol}</p>
          <div className="flex items-center gap-1.5">
            <TokenAvatar symbol={p.symbol} uri={p.uri} size="w-4 h-4" text="text-[6px]" />
            <span className="truncate text-sm font-bold text-[#fafafa]">{fmt(Number(p.outToken), 0)}</span>
          </div>
        </div>
        <div className="rounded-[12px] border border-[#212225] bg-[#111113] p-3">
          <p className="mb-1 text-xs text-[#696e77]">Value / Share</p>
          <p className="text-sm font-bold leading-tight text-[#86efac]">≈ {fmt(value, 3)} SOL</p>
          {p.locked && <p className="mt-1 text-xs font-semibold leading-tight text-[#696e77]">Locked</p>}
        </div>
      </div>
    </div>
  );
}

export function Liquidity({ initialMint = "" }: { initialMint?: string }) {
  const { connection } = useConnection();
  const wallet = useAppWallet();
  const owner = wallet.publicKey?.toBase58() ?? "";

  const [tokens, setTokens] = useState<{ owner: string; list: WalletToken[] } | null>(null);
  const [solBal, setSolBal] = useState(0);
  const [selectedMint, setSelectedMint] = useState<string | null>(initialMint || null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tokenAmount, setTokenAmount] = useState("");
  const [solAmount, setSolAmount] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pools, setPools] = useState<UserPosition[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [removing, setRemoving] = useState<UserPosition | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const walletTokens = tokens && tokens.owner === owner ? tokens.list : [];
  const loadingTokens = !!owner && (!tokens || tokens.owner !== owner);
  const selected = walletTokens.find((t) => t.mint === selectedMint) ?? null;

  const loadAll = useCallback(async () => {
    if (!wallet.publicKey) return;
    const pk = wallet.publicKey;
    const [list, lamports, positions] = await Promise.all([
      listWalletTokens(connection, pk).catch(() => [] as WalletToken[]),
      connection.getBalance(pk).catch(() => 0),
      listPositions(connection, pk).catch(() => [] as UserPosition[]),
    ]);
    setTokens({ owner: pk.toBase58(), list });
    setSolBal(lamports / LAMPORTS_PER_SOL);
    setPools(positions);
  }, [connection, wallet.publicKey]);

  useEffect(() => {
    let alive = true;
    if (!wallet.publicKey) return;
    const pk = wallet.publicKey;
    Promise.all([
      listWalletTokens(connection, pk).catch(() => [] as WalletToken[]),
      connection.getBalance(pk).catch(() => 0),
      listPositions(connection, pk).catch(() => [] as UserPosition[]),
    ]).then(([list, lamports, positions]) => {
      if (!alive) return;
      setTokens({ owner: pk.toBase58(), list });
      setSolBal(lamports / LAMPORTS_PER_SOL);
      setPools(positions);
    });
    return () => {
      alive = false;
    };
  }, [connection, wallet.publicKey]);

  useEffect(() => {
    const close = (e: MouseEvent) => !dropRef.current?.contains(e.target as Node) && setDropdownOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function refresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  async function createPool() {
    if (!wallet.publicKey) {
      wallet.connect();
      toast("Connect your wallet to continue");
      return;
    }
    if (!selected) return toast.error("Choose your token first");
    if (!(Number(tokenAmount) > 0) || !(Number(solAmount) > 0)) return toast.error("Enter both amounts");
    setCreating(true);
    const t = toast.loading("Creating pool…");
    try {
      const { tx, positionNft } = await buildCreatePoolTx(connection, {
        owner: wallet.publicKey,
        tokenMint: new PublicKey(selected.mint),
        tokenAmount,
        solAmount,
        feeBps: SWAP_FEE_BPS,
        lockLiquidity: false,
      });
      await sendAndConfirm(wallet, connection, tx, [positionNft]);
      toast.success("Pool created successfully, it can take a few minutes to show on Dexscreener", { id: t });
      setTokenAmount("");
      setSolAmount("");
      await loadAll();
    } catch (e) {
      toast.error(friendlyError(e), { id: t });
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="min-h-screen px-4 pb-20 pt-12 sm:px-8">
      {removing && (
        <RemoveModal
          p={removing}
          onClose={() => setRemoving(null)}
          onDone={() => {
            setRemoving(null);
            void loadAll();
          }}
        />
      )}

      <div className="mx-auto max-w-2xl">
        <h1 className="mb-8 text-center text-3xl font-bold tracking-tight text-[#fafafa]">Create Liquidity Pool</h1>

        <div className="mb-10 rounded-[16px] border border-[#212225] bg-[#18191b] p-6">
          <p className="mb-4 text-sm font-semibold text-[#e4e4e7]">For which token would you like to create a pool?</p>

          <div className="relative mb-4" ref={dropRef}>
            {selected ? (
              <div className="flex h-11 w-full items-center justify-between rounded-[12px] border border-[#212225] bg-[#111113] px-3">
                <button type="button" onClick={() => setDropdownOpen((o) => !o)} className="flex h-full min-w-0 flex-1 items-center gap-2 text-left">
                  <TokenAvatar symbol={selected.symbol} uri={selected.uri} />
                  <span className="shrink-0 text-sm font-semibold text-[#fafafa]">{selected.symbol}</span>
                  <span className="truncate text-sm text-[#696e77]">- Balance: {fmt(selected.balance)} {selected.symbol}</span>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label="Clear"
                    onClick={() => {
                      setSelectedMint(null);
                      setTokenAmount("");
                    }}
                    className="rounded-md p-1.5 text-[#696e77] transition-colors hover:text-[#fafafa]"
                  >
                    <X size={14} />
                  </button>
                  <button type="button" aria-label="Open" onClick={() => setDropdownOpen((o) => !o)} className="p-1 text-[#696e77] transition-colors hover:text-[#fafafa]">
                    <ChevronDown size={15} className={`transition-transform duration-150 ${dropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => (wallet.publicKey ? setDropdownOpen((o) => !o) : wallet.connect())}
                className="flex h-11 w-full items-center justify-between rounded-[12px] border border-[#212225] bg-[#111113] px-3 text-sm outline-none transition-all duration-150 hover:border-[#272a2d] focus:border-[#696e77]"
              >
                <span className="text-[#363a3f]">{loadingTokens ? "Loading tokens…" : "Choose your token"}</span>
                <ChevronDown size={16} className={`text-[#696e77] transition-transform duration-150 ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>
            )}

            {dropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-hidden overflow-y-auto rounded-[12px] border border-[#212225] bg-[#18191b] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                {walletTokens.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-[#696e77]">{owner ? (loadingTokens ? "Loading tokens…" : "No SPL tokens in this wallet.") : "Connect a wallet to list tokens."}</p>
                ) : (
                  walletTokens.map((t) => (
                    <button
                      key={t.mint}
                      type="button"
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-[#212225]"
                      onClick={() => {
                        setSelectedMint(t.mint);
                        setDropdownOpen(false);
                      }}
                    >
                      <TokenAvatar symbol={t.symbol} uri={t.uri} />
                      <span className="font-semibold text-[#fafafa]">{t.symbol}</span>
                      <span className="truncate text-[#696e77]">- {fmt(t.balance)} {t.symbol}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {selected && (
            <>
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-[#696e77]">{shortMint(selected.mint, 8, 6)}</span>
                <button
                  type="button"
                  aria-label="Copy mint"
                  onClick={() => navigator.clipboard?.writeText(selected.mint).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
                  className="text-[#696e77] transition-colors hover:text-[#b0b4ba]"
                >
                  <Copy size={13} />
                </button>
                {copied && <span className="text-[10px] text-[#86efac]">Copied!</span>}
              </div>

              <label className="mb-2 block text-sm font-semibold text-[#e4e4e7]">Amount of ${selected.symbol}</label>
              <div className={`${inputRow} mb-1`}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={tokenAmount}
                  onChange={(e) => setTokenAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="0"
                  className="min-w-0 flex-1 bg-transparent text-sm text-[#fafafa] outline-none placeholder:text-[#2a2d31]"
                />
                <button type="button" onClick={() => setTokenAmount(fmtInput(selected.balance * 0.5))} className={pctBtn}>50%</button>
                <button type="button" onClick={() => setTokenAmount(fmtInput(selected.balance * 0.9))} className={pctBtn}>90%</button>
                <button type="button" onClick={() => setTokenAmount(fmtInput(selected.balance))} className={pctBtn}>Max</button>
              </div>
              <p className="mb-5 text-xs text-[#696e77]">Balance: {fmt(selected.balance)} {selected.symbol}</p>

              <div className="mb-2 flex items-center gap-2">
                <SolIcon />
                <label className="text-sm font-semibold text-[#e4e4e7]">Amount of SOL</label>
              </div>
              <p className="mb-5 text-xs leading-relaxed text-[#696e77]">
                Pairing with SOL on Meteora. An additional {lamportsToSol(FEES.createLiquidity)} SOL app fee applies to create the pool.
              </p>
              <div className={`${inputRow} mb-1`}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={solAmount}
                  onChange={(e) => setSolAmount(e.target.value.replace(/[^\d.]/g, ""))}
                  placeholder="0.00"
                  className="min-w-0 flex-1 bg-transparent text-sm text-[#fafafa] outline-none placeholder:text-[#2a2d31]"
                />
                <button type="button" onClick={() => setSolAmount(fmtInput(solBal * 0.5))} className={pctBtn}>50%</button>
                <button
                  type="button"
                  onClick={() => setSolAmount(fmtInput(Math.max(0, solBal - SOL_RESERVE - lamportsToSol(FEES.createLiquidity))))}
                  className={pctBtn}
                >
                  Max
                </button>
              </div>
              <p className="mb-6 text-xs text-[#696e77]">Balance: {fmt(solBal, 6)} SOL</p>

              <button
                type="button"
                onClick={() => void createPool()}
                disabled={creating}
                className="flex h-12 w-full select-none items-center justify-center rounded-[12px] bg-[#86efac] text-base font-bold text-[#052e16] transition-all duration-150 hover:bg-[#bbf7d0] active:translate-y-px disabled:opacity-60"
              >
                {creating ? "Creating pool…" : "Create Pool"}
              </button>
            </>
          )}
        </div>

        <div>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#fafafa]">Your Pools</h2>
            <button
              type="button"
              aria-label="Refresh"
              onClick={() => void refresh()}
              className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#212225] transition-all duration-150 hover:bg-[#272a2d] active:translate-y-px"
            >
              <RefreshCw size={15} className={`text-[#b0b4ba] ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
          {owner && pools === null ? (
            <p className="text-sm text-[#696e77]">Loading positions…</p>
          ) : !pools?.length || !owner ? (
            <p className="text-sm text-[#696e77]">No pools yet. Create one above or connect a wallet with LP positions.</p>
          ) : (
            <div className="space-y-5">
              {pools.map((p) => (
                <PoolRow key={p.position.toBase58()} p={p} onRemove={() => setRemoving(p)} onClaimed={() => void loadAll()} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
