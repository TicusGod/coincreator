import { CreateCoinForm } from "@/components/CreateCoinForm";
import { TokenTools } from "@/components/TokenTools";
import { CreateCoinExplainer } from "@/components/Explainers";
import { PageTitle, ToolLayout } from "@/components/ui";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export default async function Home({ searchParams }: PageProps<"/">) {
  const { copy } = await searchParams;
  const address = typeof copy === "string" && BASE58.test(copy) ? copy : undefined;
  return (
    <ToolLayout
      title={
        <PageTitle
          title={address ? "Copy this coin" : "Solana Token"}
          accent={address ? "in 1 click" : "Creator"}
          subtitle="The fastest way to create a Solana SPL token. Simple, beautiful, and ready for a Meteora pool in one click."
        />
      }
      tool={
        <>
          <CreateCoinForm key={address ?? "new"} copy={address} />
          <TokenTools />
        </>
      }
      aside={<CreateCoinExplainer />}
    />
  );
}
