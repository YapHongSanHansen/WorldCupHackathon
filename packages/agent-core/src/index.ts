/**
 * `@wc/agent-core` — the deterministic, chain-agnostic betting brain.
 *
 * Consumes a materialised `MatchState` (from the replay engine or a live feed)
 * plus user preferences and runtime context, and emits an `AgentDecision`
 * (BET/SKIP) with full explainability. Also re-exports the recommendation
 * state machine (spec §28) so the API and web layers share one contract.
 */

export { PressureEdgeV1, pressureEdgeV1 } from "./pressureEdge.js";
export {
  MODE_CONFIG,
  DEFAULT_PREFERENCES,
  DEFAULT_STALE_AFTER_MS,
  type ModeConfig,
} from "./config.js";
export {
  extractPressure,
  impliedProbabilities,
  selectionProb,
  ACTION_WEIGHT,
  type PressureFeatures,
  type OutcomeProbabilities,
} from "./features.js";
export {
  computeModelInputs,
  modelProbabilities,
  isLivePhase,
  isBettablePhase,
  matchMinute,
  WARMUP_MINUTES,
  type ModelInputs,
} from "./model.js";
export { evaluateSkipGates, type GateResult } from "./skipGates.js";
export { suggestStake, type StakeInputs } from "./stake.js";

// Recommendation lifecycle (spec §28) lives in shared-types; surfaced here so
// agent consumers have a single import site.
export {
  RECOMMENDATION_TRANSITIONS,
  RECOMMENDATION_TERMINAL_STATES,
  canTransition,
  isTerminalState,
  transition,
  InvalidTransitionError,
  type RecommendationState,
} from "@wc/shared-types";
