import {
  STATUS,
  type AgentContext,
  type MatchState,
  type MatchEvent,
  type UserPreferences,
} from "@wc/shared-types";
import { DEFAULT_PREFERENCES } from "../config.js";

export const NOW = 1_783_630_000_000;

/** A bettable live-match state: 60', home 1-0, usable 1X2 odds, no freeze flags. */
export function liveState(overrides: Partial<MatchState> = {}): MatchState {
  return {
    fixtureId: "18209181",
    statusId: STATUS.SECOND_HALF,
    clock: { seconds: 60 * 60, running: true },
    score: { home: 1, away: 0 },
    stats: {},
    recentEvents: [],
    odds1x2: {
      home: 2.0,
      draw: 3.2,
      away: 4.0,
      homePct: 50,
      drawPct: 31,
      awayPct: 25,
      ts: NOW,
    },
    flags: {
      varActive: false,
      unconfirmedGoal: false,
      dataStale: false,
      marketClosed: false,
    },
    updatedAt: NOW,
    ...overrides,
  };
}

export function ctx(overrides: Partial<AgentContext> = {}): AgentContext {
  return {
    now: NOW,
    availableBalance: 1000,
    alreadyBet: false,
    dailyLoss: 0,
    marketClosed: false,
    ...overrides,
  };
}

export function prefs(overrides: Partial<UserPreferences> = {}): UserPreferences {
  return { ...DEFAULT_PREFERENCES, ...overrides };
}

export function event(action: string, participant?: number): MatchEvent {
  return { ts: NOW, action, statusId: STATUS.SECOND_HALF, participant };
}
