import { redirect } from "next/navigation";

// Old route, kept so shared links keep working.
export default function RemoveLiquidityRedirect() {
  redirect("/liquidity");
}
