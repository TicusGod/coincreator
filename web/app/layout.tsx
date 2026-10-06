import { SiteGate } from "@/components/ops/SiteGate";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";
import { site } from "@/lib/site-config";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${site.name.toUpperCase()} — Create & copy Solana coins on Meteora`,
  description: "Create a Solana coin, add Meteora liquidity, or copy a trending coin in one click.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteGate>
          <Providers>
            <Header />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:py-14">{children}</main>
            <footer className="border-t border-line py-6 text-center text-xs text-muted">
              Transactions are final and signed in your own wallet. Pools are created on Meteora DAMM v2.
            </footer>
          </Providers>
        </SiteGate>
      </body>
    </html>
  );
}
