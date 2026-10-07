// One coin launch from the browser: pin picture + metadata, build the mint tx, sign in the wallet, confirm.
// Shared by the 3-step form and the 1-click Copy Trending flow.
import type { Connection } from "@solana/web3.js";
import { buildCreateCoinTx, type CoinOptions } from "@/lib/chain/token";
import { sendAndConfirm } from "@/lib/client/send";
import type { AppWallet } from "@/lib/client/wallet";

export type LaunchStage = "uploading" | "signing" | "confirming";

export interface LaunchInput {
  name: string;
  symbol: string;
  description?: string;
  decimals: number;
  supply: bigint;
  file?: File | null;
  imageUrl?: string | null; // DexScreener picture (copy flow)
  links?: { website?: string; twitter?: string; telegram?: string; discord?: string };
  creator?: { name?: string; website?: string };
  options: CoinOptions;
}

export async function launchCoin(wallet: AppWallet, conn: Connection, input: LaunchInput, onStage?: (s: LaunchStage) => void) {
  if (!wallet.publicKey) throw new Error("Connect your wallet first");
  onStage?.("uploading");
  const body = new FormData();
  body.append("name", input.name.trim());
  body.append("symbol", input.symbol.trim());
  body.append("description", (input.description ?? "").trim());
  for (const [k, v] of Object.entries(input.links ?? {})) if (v?.trim()) body.append(k, v.trim());
  if (input.options.modifyCreator) {
    if (input.creator?.name?.trim()) body.append("creatorName", input.creator.name.trim());
    if (input.creator?.website?.trim()) body.append("creatorWebsite", input.creator.website.trim());
  }
  if (input.file) body.append("file", input.file);
  else if (input.imageUrl) body.append("imageUrl", input.imageUrl);
  const res = await fetch("/api/upload", { method: "POST", body });
  const data = (await res.json()) as { uri?: string; error?: string };
  if (!data.uri) throw new Error(data.error ?? "Upload failed.");

  onStage?.("signing");
  const { tx, mint } = await buildCreateCoinTx(conn, {
    owner: wallet.publicKey,
    name: input.name.trim(),
    symbol: input.symbol.trim(),
    uri: data.uri,
    decimals: input.decimals,
    supply: input.supply,
    ...input.options,
  });
  const sig = await sendAndConfirm(wallet, conn, tx, [mint], () => onStage?.("confirming"));
  return { mint: mint.publicKey.toBase58(), sig };
}
