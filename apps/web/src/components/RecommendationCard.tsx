"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useSim } from "@/lib/store";
import { STATE_STYLES, num } from "@/lib/format";
import type { Recommendation } from "@/lib/types";

const isActionable = (r: Recommendation) => r.state === "AWAITING_CONFIRMATION";

export function RecommendationCard({
  rec,
  home,
  away,
  compact = false,
}: {
  rec: Recommendation;
  home: string;
  away: string;
  compact?: boolean;
}) {
  const { refresh } = useSim();
  const [stake, setStake] = useState<number>(rec.stake);
  const [busy, setBusy] = useState<null | string>(null);

  const pick = rec.selection === "Home" ? home : rec.selection === "Away" ? away : "Draw";
  const potential = num(stake * rec.simulatedOdds);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    try {
      await fn();
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-xl border border-emerald-400/10 bg-pitch-800/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-grass-600/20 px-2 py-0.5 text-xs font-semibold text-grass-400">
            {rec.decision.strategyName}
          </span>
          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATE_STYLES[rec.state]}`}>
            {rec.state.replaceAll("_", " ")}
          </span>
        </div>
        <span className="text-xs text-emerald-100/40">{rec.id}</span>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-emerald-100/40">Recommendation</div>
          <div className="text-lg font-semibold">
            {pick} <span className="text-emerald-100/40">@ {rec.simulatedOdds.toFixed(2)}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-emerald-100/40">Confidence</div>
          <div className="text-lg font-semibold text-grass-400">{rec.decision.confidence}%</div>
        </div>
      </div>

      {!compact && (
        <p className="mt-2 text-sm leading-relaxed text-emerald-100/70">{rec.decision.reason}</p>
      )}

      {isActionable(rec) ? (
        <>
          <div className="mt-3 flex items-center gap-2">
            <label className="text-xs text-emerald-100/50">Stake</label>
            <input
              type="number"
              min={1}
              value={stake}
              onChange={(e) => setStake(Math.max(1, Number(e.target.value)))}
              className="w-24 rounded-lg border border-emerald-400/15 bg-pitch-900 px-2 py-1 text-sm font-mono outline-none focus:border-grass-500"
            />
            <span className="text-xs text-emerald-100/50">WCDT →</span>
            <span className="text-sm font-mono text-gold">{potential} payout</span>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              disabled={!!busy}
              onClick={() =>
                run("confirm", () => api.confirm(rec.id, stake !== rec.stake ? stake : undefined))
              }
              className="flex-1 rounded-lg bg-grass-600 px-3 py-2 text-sm font-semibold text-pitch-950 transition hover:bg-grass-500 disabled:opacity-50"
            >
              {busy === "confirm" ? "Signing…" : `Confirm & bet ${stake}`}
            </button>
            <button
              disabled={!!busy}
              onClick={() => run("reject", () => api.reject(rec.id))}
              className="rounded-lg border border-emerald-400/15 px-3 py-2 text-sm text-emerald-100/70 transition hover:bg-white/5 disabled:opacity-50"
            >
              Skip
            </button>
          </div>
        </>
      ) : rec.state === "WON" ? (
        <button
          disabled={!!busy}
          onClick={() => run("claim", () => api.claim(rec.id))}
          className="mt-3 w-full rounded-lg bg-gold px-3 py-2 text-sm font-semibold text-pitch-950 transition hover:brightness-110 disabled:opacity-50"
        >
          {busy === "claim" ? "Claiming…" : "Claim winnings"}
        </button>
      ) : (
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-emerald-100/50">Stake {num(rec.stake)} WCDT</span>
          {rec.payout != null && <span className="font-mono text-gold">+{num(rec.payout)} paid</span>}
          {rec.txSignature && (
            <span className="font-mono text-xs text-emerald-100/40">{rec.txSignature}</span>
          )}
        </div>
      )}
    </div>
  );
}
