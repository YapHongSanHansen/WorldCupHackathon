"use client";

import { useSim } from "@/lib/store";
import { FixtureCard } from "@/components/FixtureCard";

export default function MatchCentre() {
  const { fixtures, recommendations } = useSim();
  const list = Object.values(fixtures).sort((a, b) => a.fixtureId.localeCompare(b.fixtureId));
  const liveRecs = Object.values(recommendations).filter(
    (r) => r.state === "AWAITING_CONFIRMATION",
  ).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Match Centre</h1>
          <p className="mt-1 text-sm text-emerald-100/50">
            Replay a fixture and let <span className="text-grass-400">PressureEdgeV1</span> hunt live
            value. Confirm a pick to place a simulated on-chain bet.
          </p>
        </div>
        {liveRecs > 0 && (
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-sm text-gold">
            {liveRecs} recommendation{liveRecs > 1 ? "s" : ""} awaiting you
          </div>
        )}
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-emerald-400/10 bg-pitch-900/70 p-10 text-center text-emerald-100/50">
          Connecting to the simulation API…
          <div className="mt-1 text-xs text-emerald-100/30">
            Start it with <code className="font-mono">npx tsx apps/api/src/server.ts</code>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((f) => (
            <FixtureCard key={f.fixtureId} fixture={f} />
          ))}
        </div>
      )}
    </div>
  );
}
