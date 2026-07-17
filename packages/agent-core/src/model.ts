/**
 * Outcome-probability model — spec §11.7 step 1 ("build model probability from
 * recent pressure features + score state").
 *
 * We project the remainder of the match with a small Poisson goal model: each
 * side's expected remaining goals is the league base rate scaled by its share
 * of recent attacking pressure and by the minutes left. Convolving the two
 * independent Poisson tails over the current scoreline gives P(Home/Draw/Away).
 *
 * This is deliberately simple and fully deterministic — no randomness, no
 * fitted parameters beyond the documented constants — so it stays explainable
 * (spec §11.1) while still producing a genuine edge signal to compare against
 * the market (rather than just echoing the market's own implied odds).
 */

import type { MatchState } from "@wc/shared-types";
import { STATUS } from "@wc/shared-types";
import type { OutcomeProbabilities, PressureFeatures } from "./features.js";

/** Regulation / extra-time targets in minutes. */
const REGULATION_MINUTES = 90;
const EXTRA_TIME_MINUTES = 120;
/**
 * League baseline goals per team over a full match. ~1.3 each → ~2.6 total,
 * a standard men's-tournament figure. Used to set the per-minute base rate.
 */
const BASE_GOALS_PER_TEAM = 1.3;
/**
 * Never treat the result as fully decided: floor the remaining time so a late
 * scoreline still carries some uncertainty (avoids 100%-confidence bets in
 * stoppage time).
 */
const MIN_REMAINING_MINUTES = 3;
/** Poisson tail truncation — P(4+ further goals by one side) is negligible. */
const MAX_ADDITIONAL_GOALS = 6;

/** StatusIds during which the match clock is progressing toward extra time. */
const EXTRA_TIME_STATUS_IDS: ReadonlySet<number> = new Set([6, 7, 8, 9]);

export interface ModelInputs {
  minute: number;
  remainingMinutes: number;
  lambdaHome: number;
  lambdaAway: number;
  currentHome: number;
  currentAway: number;
}

function poissonPmf(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let logP = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

/** Truncated Poisson pmf over 0..MAX_ADDITIONAL_GOALS, renormalised to sum 1. */
function truncatedPmf(lambda: number): number[] {
  const pmf: number[] = [];
  let sum = 0;
  for (let k = 0; k <= MAX_ADDITIONAL_GOALS; k++) {
    const p = poissonPmf(lambda, k);
    pmf.push(p);
    sum += p;
  }
  if (sum > 0) for (let k = 0; k < pmf.length; k++) pmf[k]! /= sum;
  return pmf;
}

/**
 * Compute the model inputs from state + pressure. `remainingMinutes` targets
 * 90' in regulation and 120' once extra time is underway. Pressure share tilts
 * each side's rate around the base: a 50/50 share → 1× base, and a 70/30 share
 * → 1.4× / 0.6× (share is doubled, then clamped to a sane band).
 */
export function computeModelInputs(
  state: MatchState,
  pressure: PressureFeatures,
): ModelInputs {
  const minute = state.clock.seconds / 60;
  const inExtraTime =
    (state.statusId !== null && EXTRA_TIME_STATUS_IDS.has(state.statusId)) ||
    minute > REGULATION_MINUTES;
  const target = inExtraTime ? EXTRA_TIME_MINUTES : REGULATION_MINUTES;
  const remainingMinutes = Math.max(MIN_REMAINING_MINUTES, target - minute);

  const baseRatePerMinute = BASE_GOALS_PER_TEAM / REGULATION_MINUTES;
  // Pressure multiplier: 2 * share, clamped to [0.4, 1.6] so an empty or
  // lopsided window can't drive a rate to zero or blow it up.
  const homeMult = clamp(2 * pressure.pressureShareHome, 0.4, 1.6);
  const awayMult = clamp(2 * (1 - pressure.pressureShareHome), 0.4, 1.6);

  const lambdaHome = baseRatePerMinute * homeMult * remainingMinutes;
  const lambdaAway = baseRatePerMinute * awayMult * remainingMinutes;

  return {
    minute,
    remainingMinutes,
    lambdaHome,
    lambdaAway,
    currentHome: state.score.home,
    currentAway: state.score.away,
  };
}

/** Convolve the two Poisson tails over the current scoreline → 1X2 probs. */
export function modelProbabilities(inputs: ModelInputs): OutcomeProbabilities {
  const pmfHome = truncatedPmf(inputs.lambdaHome);
  const pmfAway = truncatedPmf(inputs.lambdaAway);

  let home = 0;
  let draw = 0;
  let away = 0;
  for (let kh = 0; kh < pmfHome.length; kh++) {
    const finalHome = inputs.currentHome + kh;
    for (let ka = 0; ka < pmfAway.length; ka++) {
      const finalAway = inputs.currentAway + ka;
      const p = pmfHome[kh]! * pmfAway[ka]!;
      if (finalHome > finalAway) home += p;
      else if (finalHome < finalAway) away += p;
      else draw += p;
    }
  }

  const sum = home + draw + away;
  if (sum > 0) {
    home /= sum;
    draw /= sum;
    away /= sum;
  }
  return { home, draw, away };
}

/**
 * Opening minutes are ignored: a "pressure edge" needs some play to measure,
 * and betting off the first event or two is just noise (spec §11.1 — prefer
 * SKIP when uncertain). The match clock is continuous, so this never blocks
 * second-half or extra-time betting.
 */
export const WARMUP_MINUTES = 5;

export const matchMinute = (state: MatchState): number => state.clock.seconds / 60;

/** True once the match has actually kicked off and is not yet terminal. */
export function isLivePhase(state: MatchState): boolean {
  const s = state.statusId;
  if (s === null) return false;
  if (s === STATUS.PRE_MATCH) return false;
  if (s === STATUS.FULL_TIME || s === STATUS.FINALISED) return false;
  // First half (2), halftime (3), second half (4), extra-time phases (6-9).
  return true;
}

/** Live and past the warmup window — the phase in which the strategy may bet. */
export function isBettablePhase(state: MatchState): boolean {
  return isLivePhase(state) && matchMinute(state) >= WARMUP_MINUTES;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
