import { SiteGate } from "@/components/ops/SiteGate";
import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Montserrat } from "next/font/google";
import { Header } from "@/components/Header";
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
            <Header />
            <div className="flex min-h-[calc(100dvh-4rem)] flex-col lg:min-h-dvh lg:pl-[264px]">
              <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 pb-16 pt-6 sm:pt-10 lg:px-10 lg:pt-7">{children}</main>
              <footer className="border-t border-white/[.05]">
                <div className="mx-auto flex max-w-[1320px] flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-dim sm:flex-row lg:px-10">
                  <span>All transactions are final. We never hold your keys or your coins.{site.email && <> · <a href={`mailto:${site.email}`} className="hover:text-muted">{site.email}</a></>}</span>
                  <span>
                    © {new Date().getFullYear()} {site.name}.fun · Liquidity by <span className="font-semibold text-brand">Meteora</span>
                  </span>
                </div>
              </footer>
            </div>
          </Providers>
        </SiteGate>
      </body>
    </html>
  );
}
