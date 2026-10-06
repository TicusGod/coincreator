// "My Coins": every SPL coin whose Metaplex update authority is the connected wallet, found from the wallet's
// token accounts (zero balances included) and its Meteora positions. Works on any RPC (no indexer needed).
import { Connection, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { metadataPda } from "./metaplex";
import { listPositions, type UserPosition } from "./meteora";

export interface MyCoin {
  mint: PublicKey;
  name: string;
  symbol: string;
  uri: string;
  decimals: number;
  supply: number; // UI units
  balance: number; // held by the wallet, UI units
  mintRevoked: boolean;
  freezeRevoked: boolean;
  immutable: boolean;
  positions: UserPosition[];
}

interface ParsedMeta {
  updateAuthority: string;
  name: string;
  symbol: string;
  uri: string;
  isMutable: boolean;
}

/** Metaplex Metadata v1 layout: key, update_authority, mint, name, symbol, uri, fee, creators?, primary_sale, is_mutable. */
export function parseMetadata(d: Buffer): ParsedMeta | null {
  try {
    let o = 1;
    const updateAuthority = new PublicKey(d.subarray(o, o + 32)).toBase58();
    o += 64;
    const str = () => {
      const len = d.readUInt32LE(o);
      const v = d.subarray(o + 4, o + 4 + len).toString("utf8").replace(/\0/g, "").trim();
      o += 4 + len;
      return v;
    };
    const name = str();
    const symbol = str();
    const uri = str();
    o += 2; // seller_fee_basis_points
    if (d[o++] === 1) o += 4 + d.readUInt32LE(o) * 34; // creators
    o += 1; // primary_sale_happened
    return { updateAuthority, name, symbol, uri, isMutable: d[o] === 1 };
  } catch {
    return null;
  }
}

async function multiple(conn: Connection, keys: PublicKey[]) {
  const out = [];
  for (let i = 0; i < keys.length; i += 100) out.push(...(await conn.getMultipleAccountsInfo(keys.slice(i, i + 100))));
  return out;
}

export async function findMyCoins(conn: Connection, owner: PublicKey): Promise<MyCoin[]> {
  const [accs, positions] = await Promise.all([
    conn.getParsedTokenAccountsByOwner(owner, { programId: TOKEN_PROGRAM_ID }),
    listPositions(conn, owner).catch(() => [] as UserPosition[]),
  ]);
  const balances = new Map<string, number>();
  for (const a of accs.value) {
    const info = a.account.data.parsed.info;
    balances.set(info.mint, (balances.get(info.mint) ?? 0) + Number(info.tokenAmount.uiAmount ?? 0));
  }
  const mints = [...new Set([...balances.keys(), ...positions.map((p) => p.tokenMint.toBase58())])].map((m) => new PublicKey(m));
  if (!mints.length) return [];

  const metas = await multiple(conn, mints.map(metadataPda));
  const mine = mints
    .map((mint, i) => ({ mint, meta: metas[i] ? parseMetadata(metas[i]!.data) : null }))
    .filter((m): m is { mint: PublicKey; meta: ParsedMeta } => m.meta?.updateAuthority === owner.toBase58());
  if (!mine.length) return [];

  const mintInfos = await multiple(conn, mine.map((m) => m.mint));
  return mine
    .map(({ mint, meta }, i) => {
      const d = mintInfos[i]?.data;
      if (!d || d.length < 82) return null;
      // SPL mint layout: mintAuthorityOption u32, authority 32, supply u64, decimals u8, initialized, freezeOption u32, freeze 32
      const decimals = d[44];
      const supply = Number(d.readBigUInt64LE(36)) / 10 ** decimals;
      return {
        mint,
        name: meta.name,
        symbol: meta.symbol,
        uri: meta.uri,
        decimals,
        supply,
        balance: balances.get(mint.toBase58()) ?? 0,
        mintRevoked: d.readUInt32LE(0) === 0,
        freezeRevoked: d.readUInt32LE(46) === 0,
        immutable: !meta.isMutable,
        positions: positions.filter((p) => p.tokenMint.equals(mint)),
      };
    })
    .filter((c): c is MyCoin => c !== null);
}
