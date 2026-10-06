import { CreateLiquidityForm } from "@/components/CreateLiquidityForm";
import { PageTitle } from "@/components/ui";

export default async function CreateLiquidityPage({ searchParams }: PageProps<"/create-liquidity">) {
  const { mint } = await searchParams;
  return (
    <>
      <PageTitle title="Create Liquidity" subtitle="Open a TOKEN/SOL pool on Meteora DAMM v2. Your coin becomes tradable on Jupiter, DexScreener and every Solana wallet." />
      <CreateLiquidityForm initialMint={typeof mint === "string" ? mint : ""} />
    </>
  );
}
