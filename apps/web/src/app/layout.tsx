import type { Metadata } from "next";
import "./globals.css";
import { SolanaWalletProvider } from "@/components/WalletProvider";
import { SimProvider } from "@/lib/store";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "World Cup Betting Agent",
  description: "Simulation-only in-play betting agent on Solana",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SolanaWalletProvider>
          <SimProvider>
            <Header />
            <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-6">{children}</main>
            <footer className="mx-auto max-w-6xl px-4 pb-10 text-center text-xs text-emerald-200/40">
              Simulation only. WCDT has no monetary value. Not gambling advice.
            </footer>
          </SimProvider>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
