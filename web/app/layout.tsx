import { SiteGate } from "@/components/ops/SiteGate";
import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";
import { site } from "@/lib/site-config";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], weight: ["500", "600", "700", "800"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${site.name.toUpperCase()} — Create & copy Solana coins on Meteora`,
  description: "Create a Solana coin, add Meteora liquidity, or copy a trending coin in one click.",
};

export const viewport: Viewport = { themeColor: "#0b0b12" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${jakarta.variable} ${mono.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <div className="aurora" aria-hidden>
          <span className="orb orb-a" />
          <span className="orb orb-b" />
          <span className="orb orb-c" />
        </div>
        <SiteGate>
          <Providers>
            <Header />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-10 sm:pt-16">{children}</main>
            <footer className="border-t border-line/60">
              <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-dim sm:flex-row">
                <span>Every transaction is signed in your own wallet. All transactions are final.</span>
                <span className="flex items-center gap-1.5">
                  Liquidity powered by <span className="font-semibold text-brand">Meteora DAMM v2</span>
                </span>
              </div>
            </footer>
          </Providers>
        </SiteGate>
      </body>
    </html>
  );
}
