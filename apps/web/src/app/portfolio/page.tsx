"use client";

import Link from "next/link";
import { useSim } from "@/lib/store";
import { STATE_STYLES, num } from "@/lib/format";

export default function PortfolioPage() {
  const { portfolio, fixtures } = useSim();

  if (!portfolio) {
    return <div className="text-emerald-100/50">Loading portfolio…</div>;
  }

  const teamsFor = (fixtureId: string) => {
    const f = fixtures[fixtureId];
    return f ? `${f.homeTeam} v ${f.awayTeam}` : fixtureId;
  };

  const pnlColor = portfolio.realisedPnl > 0 ? "text-grass-400" : portfolio.realisedPnl < 0 ? "text-rose-300" : "text-emerald-100";

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
      <p className="mt-1 text-sm text-emerald-100/50">
        Wallet <span className="font-mono text-emerald-100/70">{portfolio.wallet}</span>
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Balance" value={`${num(portfolio.balance)}`} unit="WCDT" accent="text-gold" />
        <Stat label="Staked (live)" value={`${num(portfolio.staked)}`} unit="WCDT" />
        <Stat label="Realised P&L" value={`${portfolio.realisedPnl >= 0 ? "+" : ""}${num(portfolio.realisedPnl)}`} unit="WCDT" accent={pnlColor} />
        <Stat label="Daily loss" value={`${num(portfolio.dailyLoss)}`} unit="WCDT" />
      </div>

      <h2 className="mb-2 mt-8 text-sm font-semibold uppercase tracking-wide text-emerald-100/50">
        Bets
      </h2>
      {portfolio.bets.length === 0 ? (
        <div className="rounded-xl border border-emerald-400/10 bg-pitch-900/70 p-8 text-center text-sm text-emerald-100/50">
          No bets yet.{" "}
          <Link href="/" className="text-grass-400 hover:underline">
            Go to the Match Centre
          </Link>{" "}
          to place one.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-emerald-400/10">
          <table className="w-full text-sm">
            <thead className="bg-pitch-800/60 text-left text-xs uppercase tracking-wide text-emerald-100/40">
              <tr>
                <th className="px-4 py-2.5">Match</th>
                <th className="px-4 py-2.5">Pick</th>
                <th className="px-4 py-2.5 text-right">Stake</th>
                <th className="px-4 py-2.5 text-right">Odds</th>
                <th className="px-4 py-2.5 text-right">Payout</th>
                <th className="px-4 py-2.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.bets.map((b) => (
                <tr key={b.id} className="border-t border-emerald-400/5">
                  <td className="px-4 py-3">{teamsFor(b.fixtureId)}</td>
                  <td className="px-4 py-3 font-medium">{b.selection}</td>
                  <td className="px-4 py-3 text-right font-mono">{num(b.stake)}</td>
                  <td className="px-4 py-3 text-right font-mono">{b.odds.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-mono text-gold">
                    {b.payout != null ? `+${num(b.payout)}` : num(b.potentialPayout)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATE_STYLES[b.state]}`}>
                      {b.state.replaceAll("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  accent = "text-emerald-100",
}: {
  label: string;
  value: string;
  unit: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-emerald-400/10 bg-pitch-900/70 p-4">
      <div className="text-xs uppercase tracking-wide text-emerald-100/40">{label}</div>
      <div className={`mt-1 font-mono text-xl font-bold ${accent}`}>{value}</div>
      <div className="text-xs text-emerald-100/30">{unit}</div>
    </div>
  );
}
