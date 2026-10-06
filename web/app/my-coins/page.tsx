import { MyCoins } from "@/components/MyCoins";
import { MyCoinsExplainer } from "@/components/Explainers";
import { PageTitle, ToolLayout } from "@/components/ui";

export default function MyCoinsPage() {
  return (
    <ToolLayout
      toolWidth={760}
      title={<PageTitle title="My" accent="Coins" subtitle="Every coin you created with this wallet: contract address, live market cap, your pool and the swap fees waiting for you." />}
      tool={<MyCoins />}
      aside={<MyCoinsExplainer />}
    />
  );
}
