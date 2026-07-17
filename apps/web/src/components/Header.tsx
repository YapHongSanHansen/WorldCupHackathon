"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useSim } from "@/lib/store";
import { api } from "@/lib/api";

// Wallet button is browser-only.
const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false },
);

const NAV = [
  { href: "/", label: "Match Centre" },
  { href: "/portfolio", label: "Portfolio" },
];

export function Header() {
  const { connected, portfolio, refresh } = useSim();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-emerald-400/10 bg-pitch-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-grass-600 text-lg">⚽</span>
          <span className="font-semibold tracking-tight">
            WorldCup<span className="text-grass-400">Agent</span>
          </span>
        </Link>

        <nav className="ml-2 flex items-center gap-1 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-lg px-3 py-1.5 transition ${
                pathname === n.href
                  ? "bg-emerald-400/10 text-grass-400"
                  : "text-emerald-100/60 hover:text-emerald-100"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span
            className={`flex items-center gap-1.5 text-xs ${
              connected ? "text-grass-400" : "text-amber-400/70"
            }`}
            title={connected ? "Live feed connected" : "Connecting to feed…"}
          >
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-grass-400 live-dot" : "bg-amber-400"}`} />
            {connected ? "LIVE" : "…"}
          </span>

          <div className="hidden items-center gap-2 rounded-lg border border-emerald-400/10 bg-pitch-800 px-3 py-1.5 text-sm sm:flex">
            <span className="text-emerald-100/50">Balance</span>
            <span className="font-mono font-semibold text-gold">
              {portfolio ? portfolio.balance.toLocaleString() : "…"}
            </span>
            <span className="text-emerald-100/40">WCDT</span>
          </div>

          <button
            onClick={async () => {
              await api.faucet(1000);
              await refresh();
            }}
            className="rounded-lg border border-grass-600/40 bg-grass-600/15 px-3 py-1.5 text-sm text-grass-400 transition hover:bg-grass-600/25"
          >
            + Faucet 1k
          </button>

          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
}
