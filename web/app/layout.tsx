import { SiteGate } from "@/components/ops/SiteGate";
import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Montserrat } from "next/font/google";
import { Banner } from "@/components/Banner";
import { Header, Sidebar } from "@/components/Header";
import { Providers } from "@/components/Providers";
import { site } from "@/lib/site-config";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url ?? "https://coincreator.fun"),
  title: `${site.name} — Create & copy Solana coins on Meteora`,
  description: "Create a Solana coin, add Meteora liquidity, or copy a trending coin in one click.",
};

export const viewport: Viewport = { themeColor: "#0b0b12" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable} ${mono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <div className="aurora" aria-hidden>
          <span className="orb orb-a" />
          <span className="orb orb-b" />
          <span className="orb orb-c" />
        </div>
        <SiteGate>
          <Providers>
            <Banner />
            <Header />
            <div className="flex flex-1">
              <Sidebar />
              <div className="flex min-w-0 flex-1 flex-col border-white/[.06] bg-white/[.015] lg:rounded-tl-[30px] lg:border-l lg:border-t">
                <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 pb-16 pt-10 sm:pt-14">{children}</main>
                <footer className="px-4 py-6 text-center text-xs text-dim">
                  All transactions are final. We never hold your keys or your coins · © {new Date().getFullYear()} coincreator.fun · Liquidity by{" "}
                  <span className="font-semibold text-brand">Meteora</span>
                </footer>
              </div>
            </div>
          </Providers>
        </SiteGate>
      </body>
    </html>
  );
}
