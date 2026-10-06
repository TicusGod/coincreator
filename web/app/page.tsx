import { CreateCoinForm } from "@/components/CreateCoinForm";
import { TokenTools } from "@/components/TokenTools";
import { CreateCoinExplainer } from "@/components/Explainers";
import { PageTitle } from "@/components/ui";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export default async function Home({ searchParams }: PageProps<"/">) {
  const { copy } = await searchParams;
  const address = typeof copy === "string" && BASE58.test(copy) ? copy : undefined;
  return (
    <>
      <PageTitle
        eyebrow={address ? "Copy mode" : "Solana token creator"}
        title={address ? "Copy this coin" : "Solana Token"}
        accent={address ? "in 1 click" : "Creator"}
        subtitle="The fastest way to create a Solana SPL token. Simple, beautiful, and ready for a Meteora pool in one click."
      />
      <CreateCoinForm key={address ?? "new"} copy={address} />
      <TokenTools />
      <CreateCoinExplainer />
    </>
  );
}
