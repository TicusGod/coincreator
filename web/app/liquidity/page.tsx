import { Liquidity } from "@/components/Liquidity";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export default async function LiquidityPage({ searchParams }: PageProps<"/liquidity">) {
  const { mint } = await searchParams;
  return <Liquidity initialMint={typeof mint === "string" && BASE58.test(mint) ? mint : ""} />;
}
