import { CopyTrending } from "@/components/CopyTrending";
import { PageTitle } from "@/components/ui";

export default function CopyTrendingPage() {
  return (
    <>
      <PageTitle title="Copy Trending Coins" accent="in 1 Click" subtitle="Pick a coin that's running on Solana, clone its name, ticker, image and socials, and launch your own." />
      <CopyTrending />
    </>
  );
}
