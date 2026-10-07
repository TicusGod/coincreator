import { SiteGate } from "@/components/ops/SiteGate";
import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { Banner } from "@/components/Banner";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/Toaster";
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
            <div className="min-h-screen bg-[#111113] text-[#fafafa]">
              <Toaster />
              <Banner />
              <Header />
              <main>{children}</main>
              <footer className="px-4 pb-8 pt-4 text-center text-[11px] text-[#696e77]">
                All transactions are final. We never hold your keys or your coins.
                {site.email && (
                  <>
                    {" "}· <a href={`mailto:${site.email}`} className="hover:text-[#b0b4ba]">{site.email}</a>
                  </>
                )}
              </footer>
            </div>
          </Providers>
        </SiteGate>
      </body>
    </html>
  );
}
