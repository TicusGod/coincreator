import { CreateCoinForm } from "@/components/CreateCoinForm";
import { PageTitle } from "@/components/ui";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export default async function Home({ searchParams }: PageProps<"/">) {
  const { copy } = await searchParams;
  const address = typeof copy === "string" && BASE58.test(copy) ? copy : undefined;
  return (
    <>
      <PageTitle
        title={address ? "Copy This Coin" : "Launch Your Own"}
        accent={address ? "in 1 Click" : "Coin"}
        subtitle={address ? "Everything is pre-filled from the original. Edit what you want and launch your version." : "Launch your own token on Solana in seconds. No coding required."}
      />
      <CreateCoinForm key={address ?? "new"} copy={address} />
    </>
  );
}
