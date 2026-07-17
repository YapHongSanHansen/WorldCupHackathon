/**
 * Mandatory SKIP gates — spec §11.5.
 *
 * These are evaluated before any strategy math. If any fires the agent must
 * SKIP, regardless of how attractive the edge looks. Order matters only for
 * which reason is surfaced first; the check itself is exhaustive.
 */

import type {
  AgentContext,
  MatchState,
  SkipReason,
  UserPreferences,
} from "@wc/shared-types";
import { DEFAULT_STALE_AFTER_MS } from "./config.js";
import { impliedProbabilities } from "./features.js";
import { isLivePhase, matchMinute, WARMUP_MINUTES } from "./model.js";

export interface GateResult {
  skip: boolean;
  reason?: SkipReason;
  detail?: string;
}

const pass: GateResult = { skip: false };

/**
 * Returns the first failing gate, or `{ skip: false }` if the market is
 * bettable. Confidence (`LOW_CONFIDENCE`) and edge (`NO_EDGE`) are enforced by
 * the strategy after this passes — they need the computed decision.
 */
export function evaluateSkipGates(
  state: MatchState,
  preferences: UserPreferences,
  context: AgentContext,
): GateResult {
  // Scope — is this fixture in the user's selection?
  if (
    preferences.matchScope === "selected" &&
    !preferences.selectedFixtureIds.includes(state.fixtureId)
  ) {
    return { skip: true, reason: "OUT_OF_SCOPE", detail: `fixture ${state.fixtureId} not selected` };
  }

  // Phase — PressureEdgeV1 requires a live match past the opening warmup.
  if (!isLivePhase(state)) {
    return { skip: true, reason: "INVALID_PHASE", detail: `statusId ${state.statusId}` };
  }
  if (matchMinute(state) < WARMUP_MINUTES) {
    return {
      skip: true,
      reason: "INVALID_PHASE",
      detail: `warmup (minute ${matchMinute(state).toFixed(1)} < ${WARMUP_MINUTES})`,
    };
  }

  // Market closed on-chain or locally.
  if (context.marketClosed || state.flags.marketClosed) {
    return { skip: true, reason: "MARKET_CLOSED" };
  }

  // Data staleness — no fresh frame within the window.
  const staleAfter = context.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;
  if (state.flags.dataStale || context.now - state.updatedAt > staleAfter) {
    return {
      skip: true,
      reason: "DATA_STALE",
      detail: `${context.now - state.updatedAt}ms since last frame`,
    };
  }

  // VAR in progress — freeze (spec §9.3 / §11.5).
  if (state.flags.varActive) {
    return { skip: true, reason: "VAR_ACTIVE" };
  }

  // Unconfirmed goal outstanding — the scoreline may change.
  if (state.flags.unconfirmedGoal) {
    return { skip: true, reason: "UNCONFIRMED_GOAL" };
  }

  // 1X2 odds unavailable/unusable, or the odds frame itself is stale.
  const implied = impliedProbabilities(state.odds1x2);
  if (!implied) {
    return { skip: true, reason: "ODDS_UNAVAILABLE" };
  }
  if (state.odds1x2 && context.now - state.odds1x2.ts > staleAfter) {
    return { skip: true, reason: "ODDS_UNAVAILABLE", detail: "odds frame stale" };
  }

  // Daily virtual-loss limit reached.
  if (context.dailyLoss >= preferences.maxDailyVirtualLoss) {
    return { skip: true, reason: "DAILY_LOSS_LIMIT" };
  }

  // One bet per market/fixture (also enforced on-chain by the Bet PDA).
  if (context.alreadyBet) {
    return { skip: true, reason: "ALREADY_BET" };
  }

  return pass;
}
