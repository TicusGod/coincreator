import { CreateLiquidityForm } from "@/components/CreateLiquidityForm";
import { CreateLiquidityExplainer } from "@/components/Explainers";
import { PageTitle, ToolLayout } from "@/components/ui";

export default async function CreateLiquidityPage({ searchParams }: PageProps<"/create-liquidity">) {
  const { mint } = await searchParams;
  return (
    <ToolLayout
      toolWidth={540}
      title={<PageTitle title="Create" accent="Liquidity" subtitle="Open a TOKEN/SOL pool. Your coin becomes tradable on Jupiter, DexScreener and every Solana wallet." />}
      tool={<CreateLiquidityForm initialMint={typeof mint === "string" ? mint : ""} />}
      aside={<CreateLiquidityExplainer />}
    />
  );
}
