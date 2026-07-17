import type { MatchState, RecommendationState, Selection } from "./types";

export const minute = (s: MatchState | null): string => {
  if (!s) return "—";
  const m = Math.floor(s.clock.seconds / 60);
  return `${m}'`;
};

export const phaseLabel = (statusId: number | null): string => {
  switch (statusId) {
    case 1:
      return "Pre-match";
    case 2:
      return "1st half";
    case 3:
      return "Half time";
    case 4:
      return "2nd half";
    case 5:
      return "Full time";
    case 100:
      return "Final";
    default:
      return statusId && statusId >= 6 && statusId <= 9 ? "Extra time" : "Live";
  }
};

export const selectionLabel = (s: Selection, home: string, away: string): string =>
  s === "Home" ? home : s === "Away" ? away : "Draw";

export const STATE_STYLES: Record<RecommendationState, string> = {
  CREATED: "text-emerald-100/60 bg-emerald-400/10",
  SENT: "text-emerald-100/60 bg-emerald-400/10",
  AWAITING_CONFIRMATION: "text-gold bg-amber-400/10 border border-amber-400/30",
  CONFIRMED: "text-sky-300 bg-sky-400/10",
  TRANSACTION_PENDING: "text-sky-300 bg-sky-400/10",
  RECORDED_ON_CHAIN: "text-grass-400 bg-grass-600/15",
  WON: "text-grass-400 bg-grass-600/20 border border-grass-500/40",
  LOST: "text-rose-300 bg-rose-500/10",
  VOID: "text-emerald-100/50 bg-emerald-400/10",
  CLAIMED: "text-gold bg-amber-400/15 border border-amber-400/30",
  REJECTED: "text-emerald-100/40 bg-white/5",
  EXPIRED: "text-emerald-100/40 bg-white/5",
};

export const num = (n: number): string => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
