import Link from "next/link";
import { CreateLiquidityForm } from "@/components/CreateLiquidityForm";
import { RemoveLiquidity } from "@/components/RemoveLiquidity";
import { PageTitle } from "@/components/ui";

const TABS = [
  { key: "create", label: "Create Liquidity" },
  { key: "remove", label: "Remove Liquidity" },
] as const;

export default async function LiquidityPage({ searchParams }: PageProps<"/liquidity">) {
  const { tab, mint } = await searchParams;
  const active = tab === "remove" ? "remove" : "create";
  return (
    <>
      <PageTitle
        title={active === "create" ? "Create" : "Remove"}
        accent="Liquidity"
        subtitle={active === "create" ? "Open a TOKEN/SOL pool on Meteora. Your coin becomes tradable on Jupiter, DexScreener and every wallet." : "Withdraw your Meteora positions and their swap fees back to your wallet."}
      />
      <div className="mx-auto mb-6 grid w-full max-w-[540px] grid-cols-2 gap-1 rounded-2xl border border-white/[.07] bg-black/20 p-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.key === "create" ? "/liquidity" : "/liquidity?tab=remove"}
            className={`rounded-xl py-2.5 text-center font-display text-sm font-bold transition ${
              active === t.key ? "bg-brand text-white shadow-[0_8px_20px_-10px_rgba(245,75,0,.9)]" : "text-muted hover:text-text"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>
      {active === "create" ? <CreateLiquidityForm initialMint={typeof mint === "string" ? mint : ""} /> : <RemoveLiquidity />}
    </>
  );
}
