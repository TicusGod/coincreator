import { redirect } from "next/navigation";

// Old route, kept so shared links keep working.
export default async function CreateLiquidityRedirect({ searchParams }: PageProps<"/create-liquidity">) {
  const { mint } = await searchParams;
  redirect(typeof mint === "string" ? `/liquidity?mint=${encodeURIComponent(mint)}` : "/liquidity");
}
