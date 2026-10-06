import { CreateCoinForm } from "@/components/CreateCoinForm";
import { PageTitle } from "@/components/ui";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export default async function Home({ searchParams }: PageProps<"/">) {
  const { copy } = await searchParams;
  const address = typeof copy === "string" && BASE58.test(copy) ? copy : undefined;
  return (
    <>
      <PageTitle
        eyebrow={address ? "Copy mode" : "Solana token creator"}
        title={address ? "Copy this coin" : "Create your"}
        accent={address ? "in 1 click" : "Solana coin"}
        subtitle="Name, ticker, image and supply. Minted to your wallet in one transaction, ready for a Meteora pool."
      />
      <CreateCoinForm key={address ?? "new"} copy={address} />
    </>
  );
}
