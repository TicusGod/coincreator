import { MyCoins } from "@/components/MyCoins";
import { TokenTools } from "@/components/TokenTools";
import { PageTitle } from "@/components/ui";

export default function MyCoinsPage() {
  return (
    <>
      <PageTitle title="My" accent="Coins" subtitle="Your coins, their contract address, live market cap, and the swap fees waiting for you." />
      <div className="mx-auto w-full max-w-[860px]">
        <MyCoins />
        <TokenTools />
      </div>
    </>
  );
}
