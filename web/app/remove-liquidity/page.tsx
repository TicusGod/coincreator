import { RemoveLiquidity } from "@/components/RemoveLiquidity";
import { RemoveLiquidityExplainer } from "@/components/Explainers";
import { PageTitle, ToolLayout } from "@/components/ui";

export default function RemoveLiquidityPage() {
  return (
    <ToolLayout
      title={<PageTitle eyebrow="Meteora DAMM v2" title="Remove" accent="Liquidity" subtitle="Withdraw your positions and their swap fees back to your wallet." />}
      tool={<RemoveLiquidity />}
      aside={<RemoveLiquidityExplainer />}
    />
  );
}
