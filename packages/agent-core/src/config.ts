/**
 * Mode modifiers and defaults — spec §11.6 / §11.7 / Appendix A.
 */

import type { AgentMode, UserPreferences } from "@wc/shared-types";

export interface ModeConfig {
  /** Added to the user's minimum confidence floor (percentage points). */
  confidenceFloorDelta: number;
  /** Multiplier on the raw stake. */
  stakeFactor: number;
  /** Minimum model-vs-market edge (probability points) required to bet. */
  edgeThreshold: number;
}

export const MODE_CONFIG: Readonly<Record<AgentMode, ModeConfig>> = {
  conservative: { confidenceFloorDelta: 10, stakeFactor: 0.5, edgeThreshold: 0.08 },
  balanced: { confidenceFloorDelta: 0, stakeFactor: 1.0, edgeThreshold: 0.05 },
  aggressive: { confidenceFloorDelta: -5, stakeFactor: 1.25, edgeThreshold: 0.03 },
};

/** Default staleness window for odds/data when the caller does not override. */
export const DEFAULT_STALE_AFTER_MS = 120_000;

/** Sensible MVP preference defaults (spec Appendix A). */
export const DEFAULT_PREFERENCES: UserPreferences = {
  favouriteTeams: [],
  matchScope: "all",
  selectedFixtureIds: [],
  minConfidence: 55,
  maxStakePerBet: 50,
  maxDailyVirtualLoss: 200,
  mode: "balanced",
  telegramEnabled: false,
  whatsappEnabled: false,
  requireConfirmation: true,
  preferredMarkets: ["1X2"],
};
