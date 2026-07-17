/**
 * Feature extraction — spec §11.3.
 *
 * Turns a `MatchState` into the numeric signals `PressureEdgeV1` reasons over:
 * a recent-pressure share per side (from the event ring buffer) and the market
 * implied probabilities (from the 1X2 odds). Everything here is pure and
 * deterministic so a given state always yields the same features.
 */

import type { MatchState, Odds1x2, Selection } from "@wc/shared-types";

/**
 * Attacking-intent weight per event action. Higher = more threatening. Actions
 * not listed (throw_in, goal_kick, substitution, …) carry no pressure signal.
 * Codes taken from the observed TxLINE action vocabulary (spec §9.3).
 */
export const ACTION_WEIGHT: Readonly<Record<string, number>> = {
  high_danger_possession: 3,
  shot: 2.5,
  danger_possession: 2,
  corner: 1.5,
  attack_possession: 1,
};

/**
 * Neutral-prior pseudo-pressure for share smoothing. Without it a single early
 * event yields a 100%/0% share, which slams the goal-rate multiplier to its
 * clamp and makes the model absurdly confident off one shot (see model.ts). We
 * shrink the observed share toward 0.5 by adding this much evenly-split
 * pseudo-pressure; its influence fades as the real window fills up.
 */
export const PRESSURE_PRIOR = 6;

export interface PressureFeatures {
  /** Weighted attacking pressure attributed to each side over the window. */
  homePressure: number;
  awayPressure: number;
  /** Home share of total pressure, 0..1 (0.5 when the window is empty). */
  pressureShareHome: number;
  /** Number of weighted events counted. */
  windowEvents: number;
  homeShots: number;
  awayShots: number;
  homeCorners: number;
  awayCorners: number;
}

/**
 * Home is always Participant 1, away Participant 2 (Participant1IsHome === true
 * for all six fixtures — see shared-types/fixtures). Events carry the numeric
 * participant on the score frame.
 */
export function extractPressure(state: MatchState): PressureFeatures {
  let homePressure = 0;
  let awayPressure = 0;
  let windowEvents = 0;
  let homeShots = 0;
  let awayShots = 0;
  let homeCorners = 0;
  let awayCorners = 0;

  for (const ev of state.recentEvents) {
    const weight = ACTION_WEIGHT[ev.action];
    if (weight === undefined) continue;
    const isHome = ev.participant === 1;
    const isAway = ev.participant === 2;
    if (!isHome && !isAway) continue;

    windowEvents++;
    if (isHome) homePressure += weight;
    else awayPressure += weight;

    if (ev.action === "shot") {
      if (isHome) homeShots++;
      else awayShots++;
    } else if (ev.action === "corner") {
      if (isHome) homeCorners++;
      else awayCorners++;
    }
  }

  const total = homePressure + awayPressure;
  // Shrink toward a neutral 0.5 with an evenly-split prior (see PRESSURE_PRIOR).
  const pressureShareHome =
    (homePressure + PRESSURE_PRIOR / 2) / (total + PRESSURE_PRIOR);

  return {
    homePressure,
    awayPressure,
    pressureShareHome,
    windowEvents,
    homeShots,
    awayShots,
    homeCorners,
    awayCorners,
  };
}

export interface OutcomeProbabilities {
  home: number;
  draw: number;
  away: number;
}

/**
 * Market implied probabilities, de-vigged to sum to 1. Prefers the feed's `Pct`
 * fields when all three are present (already probability-like), otherwise falls
 * back to normalising 1/decimal-odds. Returns null if odds are unusable.
 */
export function impliedProbabilities(odds: Odds1x2 | undefined): OutcomeProbabilities | null {
  if (!odds) return null;

  const { homePct, drawPct, awayPct, home, draw, away } = odds;
  if (
    typeof homePct === "number" &&
    typeof drawPct === "number" &&
    typeof awayPct === "number" &&
    homePct + drawPct + awayPct > 0
  ) {
    const sum = homePct + drawPct + awayPct;
    return { home: homePct / sum, draw: drawPct / sum, away: awayPct / sum };
  }

  if (home > 1 && draw > 1 && away > 1) {
    const rawH = 1 / home;
    const rawD = 1 / draw;
    const rawA = 1 / away;
    const sum = rawH + rawD + rawA;
    if (sum > 0) return { home: rawH / sum, draw: rawD / sum, away: rawA / sum };
  }

  return null;
}

export const selectionProb = (p: OutcomeProbabilities, s: Selection): number =>
  s === "Home" ? p.home : s === "Draw" ? p.draw : p.away;
