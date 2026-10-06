import { CreateCoinForm } from "@/components/CreateCoinForm";
import { PageTitle } from "@/components/ui";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export default async function Home({ searchParams }: PageProps<"/">) {
  const { copy } = await searchParams;
  const address = typeof copy === "string" && BASE58.test(copy) ? copy : undefined;
  return (
    <>
      <PageTitle
        title={address ? "Copy Coin" : "Create a Solana Coin"}
        subtitle="Name, symbol, image and supply. Minted to your wallet in one transaction, ready for a Meteora pool."
      />
      <CreateCoinForm key={address ?? "new"} copy={address} />
    </>
  );
}
