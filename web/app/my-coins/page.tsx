import { MyCoins } from "@/components/MyCoins";
import { TokenTools } from "@/components/TokenTools";

export default function MyCoinsPage() {
  return (
    <section className="min-h-screen px-4 pb-20 pt-12 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-center text-3xl font-bold tracking-tight text-[#fafafa]">My Coins</h1>
        <MyCoins />
        <TokenTools />
      </div>
    </section>
  );
}
