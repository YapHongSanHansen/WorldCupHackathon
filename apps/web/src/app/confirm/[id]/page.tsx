"use client";

import { use } from "react";
import Link from "next/link";
import { useSim } from "@/lib/store";
import { RecommendationCard } from "@/components/RecommendationCard";

/**
 * Deep-link confirmation page (spec §7.3 / §15) — the Telegram "Confirm" button
 * and the match centre both route here. Shows the single recommendation and its
 * confirm/reject/claim actions.
 */
export default function ConfirmPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { recommendations, fixtures } = useSim();
  const rec = recommendations[id];
  const fixture = rec ? fixtures[rec.fixtureId] : undefined;

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/" className="text-sm text-grass-400 hover:underline">
        ← Match Centre
      </Link>
      <h1 className="mb-1 mt-3 text-2xl font-bold tracking-tight">Confirm your bet</h1>
      <p className="mb-5 text-sm text-emerald-100/50">
        Review the agent&apos;s pick, adjust your stake, and confirm to place the simulated on-chain
        bet.
      </p>

      {!rec ? (
        <div className="rounded-xl border border-emerald-400/10 bg-pitch-900/70 p-8 text-center text-sm text-emerald-100/50">
          Recommendation <span className="font-mono">{id}</span> not found. It may have expired.
        </div>
      ) : (
        <RecommendationCard
          rec={rec}
          home={fixture?.homeTeam ?? "Home"}
          away={fixture?.awayTeam ?? "Away"}
        />
      )}
    </div>
  );
}
