import { RemoveLiquidity } from "@/components/RemoveLiquidity";
import { PageTitle } from "@/components/ui";

export default function RemoveLiquidityPage() {
  return (
    <>
      <PageTitle title="Remove Liquidity" subtitle="Withdraw your Meteora DAMM v2 positions back to your wallet." />
      <RemoveLiquidity />
    </>
  );
}
