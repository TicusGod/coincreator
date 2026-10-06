import { RemoveLiquidity } from "@/components/RemoveLiquidity";
import { PageTitle } from "@/components/ui";

export default function RemoveLiquidityPage() {
  return (
    <>
      <PageTitle eyebrow="Meteora DAMM v2" title="Remove" accent="Liquidity" subtitle="Withdraw your positions and their swap fees back to your wallet." />
      <RemoveLiquidity />
    </>
  );
}
