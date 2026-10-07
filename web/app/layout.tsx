import { SiteGate } from "@/components/ops/SiteGate";
import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Banner } from "@/components/Banner";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";
import { site } from "@/lib/site-config";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(site.url ?? "https://coincreator.fun"),
  title: "coincreator.fun",
  description: "Launch your own Solana coin in seconds. Meteora liquidity in 1 click, copy any trending coin.",
};

export const viewport: Viewport = { themeColor: "#111113" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} h-full`}>
      <body>
        <SiteGate>
          <Providers>
            <div className="app-shell">
              <Banner />
              <Header />
              <main className="app-content">
                {children}
                <footer className="mt-16 pb-2 text-center text-[11px] text-dim">
                  All transactions are final. We never hold your keys or your coins · © {new Date().getFullYear()} coincreator.fun
                </footer>
              </main>
            </div>
          </Providers>
        </SiteGate>
      </body>
    </html>
  );
}
