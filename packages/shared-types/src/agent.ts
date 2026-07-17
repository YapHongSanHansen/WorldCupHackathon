/**
 * Betting-agent domain types — spec §11.2.
 *
 * Framework-free so `agent-core`, `api`, and `web` share one contract. The
 * strategy consumes a materialised `MatchState` (§10.2) plus the runtime
 * `AgentContext` (balances, prior bets, market/loss limits) and returns a
 * deterministic `AgentDecision`.
 */

import type { MatchState, Selection } from "./index.js";

/** Risk profile — controls confidence floor, edge threshold and stake factor (§11.6). */
export type AgentMode = "conservative" | "balanced" | "aggressive";

/** User-configurable preferences — spec §11.2 / Appendix A. */
export interface UserPreferences {
  favouriteTeams: string[];
  matchScope: "all" | "selected";
  selectedFixtureIds: string[];
  minConfidence: number; // 0-100
  maxStakePerBet: number; // WCDT
  maxDailyVirtualLoss: number; // WCDT
  mode: AgentMode;
  notificationTimeLocal?: string;
  telegramEnabled: boolean;
  whatsappEnabled: boolean; // stored, unused in MVP send path
  requireConfirmation: true; // locked true in MVP
  preferredMarkets: Array<"1X2">;
}

export type AgentDecisionType = "BET" | "SKIP";

/**
 * Machine-readable SKIP reason codes — the mandatory gates of spec §11.5 plus
 * `NO_EDGE` for the strategy's own "no positive edge over market" outcome.
 */
export type SkipReason =
  | "OUT_OF_SCOPE"
  | "INVALID_PHASE"
  | "MARKET_CLOSED"
  | "DATA_STALE"
  | "VAR_ACTIVE"
  | "UNCONFIRMED_GOAL"
  | "ODDS_UNAVAILABLE"
  | "DAILY_LOSS_LIMIT"
  | "ALREADY_BET"
  | "LOW_CONFIDENCE"
  | "NO_EDGE";

/** A single deterministic agent decision — spec §11.2. */
export interface AgentDecision {
  type: AgentDecisionType;
  strategyName: string;
  fixtureId: string;
  market: "1X2";
  selection?: Selection;
  confidence: number; // 0-100
  suggestedStake: number;
  simulatedOdds?: number;
  potentialPayout?: number;
  reason: string;
  skipReason?: SkipReason;
  /** Explainability payload — the raw signals behind the decision (§11.3). */
  features: Record<string, number | string | boolean>;
}

/**
 * Runtime inputs the strategy cannot read off `MatchState` alone: wallet
 * balance, prior-bet / daily-loss state, on-chain market status, and the
 * virtual clock used for staleness checks. Supplied by the caller (API/replay).
 */
export interface AgentContext {
  /** Virtual timestamp (ms) used for odds/data staleness checks. */
  now: number;
  availableBalance: number; // WCDT the wallet can stake
  alreadyBet: boolean; // user already has a bet on this market/fixture
  dailyLoss: number; // WCDT lost so far today (>= 0)
  marketClosed: boolean; // market closed on-chain or locally
  /** Data considered stale once `now - updatedAt` exceeds this (ms). Default 120_000. */
  staleAfterMs?: number;
}

export interface BettingStrategy {
  readonly name: string;
  evaluate(
    state: MatchState,
    preferences: UserPreferences,
    context: AgentContext,
  ): AgentDecision;
}

export const SELECTIONS: readonly Selection[] = ["Home", "Draw", "Away"];
