import { CopyTrending } from "@/components/CopyTrending";
import { PageTitle } from "@/components/ui";

export default function CopyTrendingPage() {
  return (
    <>
      <PageTitle eyebrow="Live from DexScreener" title="Copy Trending Coins" accent="in 1 Click" subtitle="Pick a coin that's running, clone its name, ticker, image and socials, launch your own." />
      <CopyTrending />
    </>
  );
}
