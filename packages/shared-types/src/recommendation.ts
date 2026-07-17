/**
 * Recommendation lifecycle state machine — spec §28.
 *
 * A recommendation moves from CREATED through delivery, user confirmation, the
 * on-chain bet transaction, oracle settlement, and finally claim. The allowed
 * edges below are the single source of truth; `transition()` rejects anything
 * not listed (e.g. AWAITING_CONFIRMATION → RECORDED_ON_CHAIN, which must pass
 * through TRANSACTION_PENDING).
 */

export type RecommendationState =
  | "CREATED"
  | "SENT"
  | "AWAITING_CONFIRMATION"
  | "CONFIRMED"
  | "REJECTED"
  | "EXPIRED"
  | "TRANSACTION_PENDING"
  | "RECORDED_ON_CHAIN"
  | "WON"
  | "LOST"
  | "VOID"
  | "CLAIMED";

/** Allowed transitions, keyed by source state (spec §28 state diagram). */
export const RECOMMENDATION_TRANSITIONS: Record<
  RecommendationState,
  readonly RecommendationState[]
> = {
  CREATED: ["SENT"],
  SENT: ["AWAITING_CONFIRMATION"],
  AWAITING_CONFIRMATION: [
    "CONFIRMED",
    "REJECTED",
    "EXPIRED",
    "AWAITING_CONFIRMATION", // change stake — self-loop
  ],
  CONFIRMED: ["TRANSACTION_PENDING"],
  TRANSACTION_PENDING: [
    "RECORDED_ON_CHAIN",
    "AWAITING_CONFIRMATION", // tx failed / rejected
  ],
  RECORDED_ON_CHAIN: ["WON", "LOST", "VOID"],
  WON: ["CLAIMED"],
  REJECTED: [],
  EXPIRED: [],
  LOST: [],
  VOID: [],
  CLAIMED: [],
};

/** States from which no further transition is possible. */
export const RECOMMENDATION_TERMINAL_STATES: ReadonlySet<RecommendationState> =
  new Set(["REJECTED", "EXPIRED", "LOST", "VOID", "CLAIMED"]);

export function canTransition(
  from: RecommendationState,
  to: RecommendationState,
): boolean {
  return RECOMMENDATION_TRANSITIONS[from].includes(to);
}

export function isTerminalState(state: RecommendationState): boolean {
  return RECOMMENDATION_TERMINAL_STATES.has(state);
}

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: RecommendationState,
    readonly to: RecommendationState,
  ) {
    super(`Invalid recommendation transition: ${from} -> ${to}`);
    this.name = "InvalidTransitionError";
  }
}

/**
 * Return the next state if the edge is allowed, else throw
 * `InvalidTransitionError`. Pure — the caller owns persistence.
 */
export function transition(
  from: RecommendationState,
  to: RecommendationState,
): RecommendationState {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to);
  return to;
}
