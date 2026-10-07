import { CreateCoinForm } from "@/components/CreateCoinForm";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export default async function Home({ searchParams }: PageProps<"/">) {
  const { copy } = await searchParams;
  const address = typeof copy === "string" && BASE58.test(copy) ? copy : undefined;
  return (
    <div className="creator-layout">
      <section className="creator-intro">
        <h1 className="creator-title">{address ? "Copy This Coin" : "Launch Your Own Coin"}</h1>
        <p className="intro-copy">
          {address ? "Everything is pre-filled from the original. Edit what you want and launch your version." : "Launch your own token on Solana in seconds. No coding required."}
        </p>
        <CreateCoinForm key={address ?? "new"} copy={address} />
      </section>
    </div>
  );
}
