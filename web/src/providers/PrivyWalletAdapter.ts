// Privy exposed as a regular Solana wallet-adapter wallet, so every existing useWallet() call keeps working.
// Login (email → embedded wallet, or Phantom/Solflare/Backpack via Privy) happens in Privy's modal.
import {
  BaseSignerWalletAdapter,
  WalletConnectionError,
  WalletNotConnectedError,
  WalletReadyState,
  WalletSendTransactionError,
  WalletSignTransactionError,
  type SendTransactionOptions,
  type WalletName,
} from '@solana/wallet-adapter-base';
import { PublicKey, Transaction, VersionedTransaction, type Connection, type TransactionSignature } from '@solana/web3.js';
import bs58 from 'bs58';
import { assertSimulationOk, sendRawTransactionWithSimulationFallback } from '../services/solanaTxHelpers';

export const PrivyWalletName = 'Privy' as WalletName<'Privy'>;

/** What the React bridge (inside PrivyProvider) feeds the adapter. */
export interface PrivyBridgeState {
  ready: boolean;
  authenticated: boolean;
  address: string | null;
  login: () => void;
  logout: () => Promise<void>;
  signTransaction: (bytes: Uint8Array) => Promise<Uint8Array>;
  /** Wallet signs and submits itself (Phantom: `signAndSendTransaction`). Returns the raw signature. */
  signAndSendTransaction: (bytes: Uint8Array, options: { skipPreflight?: boolean; maxRetries?: number }) => Promise<Uint8Array>;
  /** Increments each time the user closes the login modal without signing in. */
  cancelCount: number;
}

const ICON =
  'data:image/svg+xml;base64,' +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#86efac"/><path d="M17 6 9 18h6l-1 8 8-12h-6z" fill="#052e16"/></svg>',
  );

const LOGIN_TIMEOUT_MS = 10 * 60 * 1000;
/** After a reload Privy reports the session before the external wallet (Phantom…) has reconnected. */
const WALLET_RESTORE_MS = 4_000;

export class PrivyWalletAdapter extends BaseSignerWalletAdapter {
  name = PrivyWalletName;
  url = 'https://privy.io';
  icon = ICON;
  readonly supportedTransactionVersions = new Set(['legacy', 0] as const);

  private _publicKey: PublicKey | null = null;
  private _connecting = false;
  private _state: PrivyBridgeState | null = null;
  private _waiters: Array<(s: PrivyBridgeState) => void> = [];

  get publicKey() {
    return this._publicKey;
  }
  get connecting() {
    return this._connecting;
  }
  get readyState() {
    return WalletReadyState.Installed;
  }

  /** Called by the bridge on every Privy state change. */
  setState(s: PrivyBridgeState) {
    this._state = s;
    for (const w of this._waiters.splice(0)) w(s);
    if (this._publicKey && (!s.authenticated || !s.address)) {
      this._publicKey = null;
      this.emit('disconnect');
    } else if (this._publicKey && s.address && s.address !== this._publicKey.toBase58()) {
      this._publicKey = new PublicKey(s.address);
      this.emit('connect', this._publicKey);
    }
  }

  private next(): Promise<PrivyBridgeState> {
    return new Promise((r) => this._waiters.push(r));
  }

  private async readyState_(): Promise<PrivyBridgeState> {
    let s = this._state;
    while (!s || !s.ready) s = await this.next();
    return s;
  }

  /** Latest state once `done` holds, or after `ms` whatever it is. */
  private async waitFor(done: (s: PrivyBridgeState) => boolean, ms: number): Promise<PrivyBridgeState> {
    let s = await this.readyState_();
    const deadline = Date.now() + ms;
    while (!done(s)) {
      const left = deadline - Date.now();
      if (left <= 0) break;
      const next = await Promise.race([this.next(), new Promise<null>((r) => setTimeout(() => r(null), left))]);
      if (next) s = next;
    }
    return s;
  }

  private attach(address: string) {
    this._publicKey = new PublicKey(address);
    this.emit('connect', this._publicKey);
  }

  /** Silent session restore on page load: attaches only if Privy already has a session. Never opens the modal. */
  async autoConnect(): Promise<void> {
    const s = await this.waitFor((x) => !x.authenticated || !!x.address, WALLET_RESTORE_MS);
    if (s.authenticated && s.address) this.attach(s.address);
    else throw new WalletConnectionError('No Privy session');
  }

  private _pending: Promise<void> | null = null;

  /** Only ever called from the Connect button. A click while a login is pending re-opens the modal. */
  async connect(): Promise<void> {
    if (this._publicKey) return;
    if (this._pending) {
      this._state?.login();
      return this._pending;
    }
    this._connecting = true;
    this._pending = (async () => {
      let s = await this.waitFor((x) => !x.authenticated || !!x.address, 1_500);
      if (s.authenticated && !s.address) {
        // Stale session: Privy is still logged in but its wallet never came back, and login() does nothing while
        // authenticated. Log out so the modal can open again (this used to need clearing localStorage).
        await s.logout().catch(() => {});
        s = await this.waitFor((x) => !x.authenticated, 5_000);
      }
      if (!(s.authenticated && s.address)) {
        const cancelsBefore = s.cancelCount;
        s.login();
        const deadline = Date.now() + LOGIN_TIMEOUT_MS;
        while (!(s.authenticated && s.address)) {
          if (s.cancelCount !== cancelsBefore) throw new WalletConnectionError('Login cancelled');
          if (Date.now() > deadline) throw new WalletConnectionError('Login timed out');
          s = await this.next();
        }
      }
      this.attach(s.address!);
    })();
    try {
      await this._pending;
    } finally {
      this._pending = null;
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    const had = !!this._publicKey;
    this._publicKey = null;
    await this._state?.logout().catch(() => {});
    if (had) this.emit('disconnect');
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
    const s = this._state;
    if (!this._publicKey || !s) throw new WalletNotConnectedError();
    try {
      if (transaction instanceof VersionedTransaction) {
        return VersionedTransaction.deserialize(await s.signTransaction(transaction.serialize())) as T;
      }
      const bytes = transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
      return Transaction.from(await s.signTransaction(bytes)) as T;
    } catch (e) {
      const err = new WalletSignTransactionError((e as Error)?.message, e);
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Every transaction is simulated on our RPC before the wallet popup. Then, following Phantom's guidance:
   * - only the user signs → the wallet signs *and sends* it (`signAndSendTransaction`, Phantom's own pipeline);
   * - extra signers (new mint, position NFT) → the wallet signs first, our keypairs after, and we send.
   * (wallet-adapter's default does the opposite: it partial-signs our keypairs before the wallet.)
   */
  async sendTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
    connection: Connection,
    options: SendTransactionOptions = {},
  ): Promise<TransactionSignature> {
    const s = this._state;
    if (!this._publicKey || !s) throw new WalletNotConnectedError();
    const { signers, ...sendOptions } = options;

    if (!(transaction instanceof VersionedTransaction)) {
      await this.prepareTransaction(transaction, connection, sendOptions);
    }
    await assertSimulationOk(connection, transaction);

    if (!signers?.length) {
      const bytes =
        transaction instanceof VersionedTransaction
          ? transaction.serialize()
          : transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
      try {
        const sig = await s.signAndSendTransaction(bytes, {
          skipPreflight: sendOptions.skipPreflight,
          maxRetries: sendOptions.maxRetries,
        });
        return bs58.encode(sig);
      } catch (e) {
        const err = new WalletSendTransactionError((e as Error)?.message, e);
        this.emit('error', err);
        throw err;
      }
    }

    const signed = await this.signTransaction(transaction);
    if (signed instanceof VersionedTransaction) signed.sign(signers);
    else signed.partialSign(...signers);
    return sendRawTransactionWithSimulationFallback(connection, signed.serialize(), { preferSkipPreflight: true });
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
    const out: T[] = [];
    for (const tx of transactions) out.push(await this.signTransaction(tx));
    return out;
  }
}

/** The single Privy wallet instance shared by the provider and the Connect button. */
export const privyAdapter = new PrivyWalletAdapter();
