// A Connection look-alike over LiteSVM, enough for the whole backend: reads clone from mainnet on first sight,
// sends keep an RPC-like history (balances, token balances, logs, fee) so getTransaction, getSignaturesForAddress,
// getSignatureStatuses and confirmTransaction answer like a node.
import { ComputeBudgetProgram, Connection, PublicKey, SystemProgram, Transaction, VersionedTransaction, type AccountInfo } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import bs58 from "bs58";
import { FailedTransactionMetadata, type LiteSVM } from "litesvm";

const UPGRADEABLE = new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111");
const LOADER_V2 = new PublicKey("BPFLoader2111111111111111111111111111111111");
const BUILTIN = new Set(
  [SystemProgram.programId, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"), ComputeBudgetProgram.programId,
    new PublicKey("SysvarRent111111111111111111111111111111111"), new PublicKey("Sysvar1nstructions1111111111111111111111111"), new PublicKey("SysvarC1ock11111111111111111111111111111111")].map(String),
);

interface TokenBal { accountIndex: number; mint: string; owner: string; programId: string; uiTokenAmount: { amount: string; decimals: number; uiAmount: number | null; uiAmountString: string } }
interface Record_ {
  signature: string;
  slot: number;
  blockTime: number;
  tx: VersionedTransaction;
  keys: PublicKey[];
  err: unknown;
  fee: number;
  logs: string[];
  pre: number[];
  post: number[];
  preTok: TokenBal[];
  postTok: TokenBal[];
}

async function retry<T>(f: () => Promise<T>, n = 6): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await f(); } catch (e) { if (i >= n) throw e; await new Promise((r) => setTimeout(r, 500 * 2 ** i)); }
  }
}

export type SvmConn = Connection & { clone(keys: PublicKey[]): Promise<void>; history: Record_[] };

export function svmConnection(svm: LiteSVM, mainnet: Connection): SvmConn {
  const cloned = new Set<string>();
  const history: Record_[] = [];
  let slot = 1000;

  async function clone(keys: PublicKey[]) {
    const need = [...new Set(keys.map(String))].filter((k) => !cloned.has(k) && !BUILTIN.has(k) && !svm.getAccount(new PublicKey(k))).map((k) => new PublicKey(k));
    for (let i = 0; i < need.length; i += 90) {
      const infos = await retry(() => mainnet.getMultipleAccountsInfo(need.slice(i, i + 90)));
      for (const [j, info] of infos.entries()) {
        const key = need[i + j]!;
        cloned.add(key.toBase58());
        if (!info) continue;
        if (info.executable && info.owner.equals(UPGRADEABLE)) { const pd = new PublicKey(info.data.subarray(4, 36)); svm.addProgram(key, (await retry(() => mainnet.getAccountInfo(pd)))!.data.subarray(45)); }
        else if (info.executable && info.owner.equals(LOADER_V2)) svm.addProgram(key, info.data);
        else svm.setAccount(key, { ...info, rentEpoch: 0, data: new Uint8Array(info.data) });
      }
    }
  }

  const read = (k: PublicKey): AccountInfo<Buffer> | null => {
    const a = svm.getAccount(k);
    return a ? { ...a, data: Buffer.from(a.data), rentEpoch: 0 } : null;
  };

  function tokenBalances(keys: PublicKey[]): TokenBal[] {
    const out: TokenBal[] = [];
    keys.forEach((k, i) => {
      const a = read(k);
      if (!a || a.data.length < 165 || !(a.owner.equals(TOKEN_PROGRAM_ID) || a.owner.equals(TOKEN_2022_PROGRAM_ID))) return;
      const amount = a.data.readBigUInt64LE(64).toString();
      out.push({ accountIndex: i, mint: new PublicKey(a.data.subarray(0, 32)).toBase58(), owner: new PublicKey(a.data.subarray(32, 64)).toBase58(), programId: a.owner.toBase58(), uiTokenAmount: { amount, decimals: 6, uiAmount: null, uiAmountString: amount } });
    });
    return out;
  }

  /** 5000 per signature + compute-unit price × limit, like the runtime charges. */
  function feeOf(tx: VersionedTransaction): number {
    let limit = 200_000;
    let price = 0;
    const keys = tx.message.staticAccountKeys;
    for (const ci of tx.message.compiledInstructions) {
      if (!keys[ci.programIdIndex]!.equals(ComputeBudgetProgram.programId)) continue;
      const d = Buffer.from(ci.data);
      if (d[0] === 2) limit = d.readUInt32LE(1);
      if (d[0] === 3) price = Number(d.readBigUInt64LE(1));
    }
    return 5000 * tx.signatures.length + Math.ceil((price * limit) / 1_000_000);
  }

  async function send(raw: Uint8Array | Buffer | number[]): Promise<string> {
    const tx = VersionedTransaction.deserialize(Uint8Array.from(raw as Uint8Array));
    const keys = [...tx.message.staticAccountKeys];
    await clone(keys);
    const pre = keys.map((k) => Number(svm.getBalance(k) ?? 0n));
    const preTok = tokenBalances(keys);
    const r = svm.sendTransaction(tx);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (conn as any).last = { cu: r instanceof FailedTransactionMetadata ? r.meta().computeUnitsConsumed() : r.computeUnitsConsumed(), bytes: raw.length };
    svm.expireBlockhash();
    const signature = bs58.encode(tx.signatures[0]!);
    if (r instanceof FailedTransactionMetadata) {
      // preflight on: a failing transaction is refused, never recorded
      const e = new Error(`send failed: ${r.err()}`) as Error & { logs: string[] };
      e.logs = r.meta().logs();
      throw e;
    }
    slot += 1;
    history.push({
      signature, slot, blockTime: Number(svm.getClock().unixTimestamp), tx, keys, err: null, fee: feeOf(tx), logs: r.logs(),
      pre, post: keys.map((k) => Number(svm.getBalance(k) ?? 0n)), preTok, postTok: tokenBalances(keys),
    });
    return signature;
  }

  const find = (sig: string) => history.find((h) => h.signature === sig);

  const conn = {
    history,
    clone,
    async getAccountInfo(k: PublicKey) {
      await clone([k]);
      return read(k);
    },
    async getAccountInfoAndContext(k: PublicKey) {
      await clone([k]);
      return { context: { slot }, value: read(k) };
    },
    async getMultipleAccountsInfoAndContext(ks: PublicKey[]) {
      await clone(ks);
      return { context: { slot }, value: ks.map(read) };
    },
    async getBlockTime() {
      return Number(svm.getClock().unixTimestamp);
    },
    rpcEndpoint: "litesvm://local",
    commitment: "confirmed",
    async getMultipleAccountsInfo(ks: PublicKey[]) {
      await clone(ks);
      return ks.map(read);
    },
    async getBalance(k: PublicKey) {
      return Number(svm.getBalance(k) ?? 0n);
    },
    async getMinimumBalanceForRentExemption(len: number) {
      return Number(svm.minimumBalanceForRentExemption(BigInt(len)));
    },
    async getTokenSupply(mint: PublicKey) {
      await clone([mint]);
      const a = read(mint)!;
      const amount = a.data.readBigUInt64LE(36).toString();
      return { context: { slot }, value: { amount, decimals: 6, uiAmount: null, uiAmountString: amount } };
    },
    async getTokenAccountBalance(k: PublicKey) {
      const a = read(k)!;
      const amount = a.data.readBigUInt64LE(64).toString();
      return { context: { slot }, value: { amount, decimals: 6, uiAmount: null, uiAmountString: amount } };
    },
    async getLatestBlockhash() {
      return { blockhash: svm.latestBlockhash(), lastValidBlockHeight: 1_000_000_000 };
    },
    async isBlockhashValid() {
      return { context: { slot }, value: true };
    },
    async getSlot() {
      return slot;
    },
    sendRawTransaction: send,
    async sendTransaction(tx: VersionedTransaction | Transaction) {
      return send(tx.serialize());
    },
    async confirmTransaction(arg: { signature: string } | string) {
      const sig = typeof arg === "string" ? arg : arg.signature;
      return { context: { slot }, value: { err: find(sig)?.err ?? null } };
    },
    async getSignatureStatuses(sigs: string[]) {
      return { context: { slot }, value: sigs.map((s) => { const h = find(s); return h ? { slot: h.slot, confirmations: 1, err: h.err, confirmationStatus: "confirmed" } : null; }) };
    },
    async getSignaturesForAddress(addr: PublicKey, opts: { until?: string; before?: string; limit?: number } = {}) {
      const out = [];
      let started = !opts.before;
      for (const h of [...history].reverse()) {
        if (!started) { started = h.signature === opts.before; continue; }
        if (opts.until && h.signature === opts.until) break;
        if (!h.keys.some((k) => k.equals(addr))) continue;
        out.push({ signature: h.signature, slot: h.slot, err: h.err, memo: null, blockTime: h.blockTime, confirmationStatus: "confirmed" });
        if (out.length >= (opts.limit ?? 1000)) break;
      }
      return out;
    },
    /** Token accounts of `owner` among every account a recorded transaction touched. */
    async getTokenAccountsByOwner(owner: PublicKey, filter: { programId?: PublicKey; mint?: PublicKey }) {
      const seen = new Set<string>();
      const value: { pubkey: PublicKey; account: AccountInfo<Buffer> }[] = [];
      for (const h of history) for (const k of h.keys) {
        if (seen.has(k.toBase58())) continue;
        seen.add(k.toBase58());
        const a = read(k);
        if (!a || a.data.length < 165 || !(a.owner.equals(TOKEN_PROGRAM_ID) || a.owner.equals(TOKEN_2022_PROGRAM_ID))) continue;
        if (filter.programId && !a.owner.equals(filter.programId)) continue;
        if (filter.mint && !new PublicKey(a.data.subarray(0, 32)).equals(filter.mint)) continue;
        if (new PublicKey(a.data.subarray(32, 64)).equals(owner)) value.push({ pubkey: k, account: a });
      }
      return { context: { slot }, value };
    },
    /** jsonParsed flavour of getTokenAccountsByOwner (only the fields the app reads). */
    async getParsedTokenAccountsByOwner(owner: PublicKey, filter: { programId?: PublicKey; mint?: PublicKey }) {
      const { value } = await (conn as unknown as { getTokenAccountsByOwner: (o: PublicKey, f: typeof filter) => Promise<{ value: { pubkey: PublicKey; account: AccountInfo<Buffer> }[] }> }).getTokenAccountsByOwner(owner, filter);
      return {
        context: { slot },
        value: value.map(({ pubkey, account }) => {
          const mint = new PublicKey(account.data.subarray(0, 32));
          const m = read(mint);
          const decimals = m ? m.data[44] : 0;
          const amount = account.data.readBigUInt64LE(64);
          return {
            pubkey,
            account: { ...account, data: { program: "spl-token", space: 165, parsed: { type: "account", info: {
              mint: mint.toBase58(), owner: owner.toBase58(),
              tokenAmount: { amount: amount.toString(), decimals, uiAmount: Number(amount) / 10 ** decimals, uiAmountString: String(Number(amount) / 10 ** decimals) },
            } } } },
          };
        }),
      };
    },
    /** Every account any recorded transaction touched, filtered like a node would (owner, dataSize, memcmp). */
    async getProgramAccounts(program: PublicKey, cfg?: { filters?: ({ dataSize: number } | { memcmp: { offset: number; bytes: string; encoding?: string } })[] } | string) {
      const filters = typeof cfg === "object" && cfg ? cfg.filters ?? [] : [];
      const seen = new Set<string>();
      const out: { pubkey: PublicKey; account: AccountInfo<Buffer> }[] = [];
      for (const h of history) for (const k of h.keys) {
        if (seen.has(k.toBase58())) continue;
        seen.add(k.toBase58());
        const a = read(k);
        if (!a || !a.owner.equals(program)) continue;
        const bytesOf = (m: { bytes: string; encoding?: string }) => (m.encoding === "base64" ? Buffer.from(m.bytes, "base64") : Buffer.from(bs58.decode(m.bytes)));
        const ok = filters.every((f) => ("dataSize" in f ? a.data.length === f.dataSize
          : a.data.subarray(f.memcmp.offset, f.memcmp.offset + bytesOf(f.memcmp).length).equals(bytesOf(f.memcmp))));
        if (ok) out.push({ pubkey: k, account: a });
      }
      return out;
    },
    async _rpcRequest(method: string, args: unknown[]) {
      if (method !== "getTransaction") throw new Error(`svm-conn: ${method} not supported`);
      const h = find(args[0] as string);
      if (!h) return { result: null };
      return {
        result: {
          slot: h.slot, blockTime: h.blockTime, version: 0,
          transaction: { message: {
            accountKeys: h.keys.map(String),
            instructions: h.tx.message.compiledInstructions.map((ix) => ({ programIdIndex: ix.programIdIndex, accounts: [...ix.accountKeyIndexes], data: bs58.encode(ix.data) })),
          } },
          meta: { err: h.err, fee: h.fee, preBalances: h.pre, postBalances: h.post, preTokenBalances: h.preTok, postTokenBalances: h.postTok, logMessages: h.logs, loadedAddresses: { writable: [], readonly: [] } },
        },
      };
    },
    async getTransaction(sig: string) {
      const h = find(sig);
      if (!h) return null;
      return {
        slot: h.slot,
        blockTime: h.blockTime,
        transaction: { message: h.tx.message, signatures: h.tx.signatures.map((s) => bs58.encode(s)) },
        meta: { err: h.err, fee: h.fee, preBalances: h.pre, postBalances: h.post, preTokenBalances: h.preTok, postTokenBalances: h.postTok, logMessages: h.logs, loadedAddresses: { writable: [], readonly: [] }, innerInstructions: [] },
        version: 0,
      };
    },
  };
  return conn as unknown as SvmConn;
}
