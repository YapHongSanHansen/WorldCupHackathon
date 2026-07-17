import { describe, it, expect } from "vitest";
import { STATUS } from "@wc/shared-types";
import { evaluateSkipGates } from "../skipGates.js";
import { liveState, ctx, prefs, NOW } from "./helpers.js";

describe("evaluateSkipGates (§11.5)", () => {
  it("passes on a clean live market", () => {
    expect(evaluateSkipGates(liveState(), prefs(), ctx()).skip).toBe(false);
  });

  it("OUT_OF_SCOPE when fixture not in the user's selection", () => {
    const r = evaluateSkipGates(
      liveState(),
      prefs({ matchScope: "selected", selectedFixtureIds: ["99999999"] }),
      ctx(),
    );
    expect(r).toMatchObject({ skip: true, reason: "OUT_OF_SCOPE" });
  });

  it("in-scope selection passes the scope gate", () => {
    const r = evaluateSkipGates(
      liveState(),
      prefs({ matchScope: "selected", selectedFixtureIds: ["18209181"] }),
      ctx(),
    );
    expect(r.skip).toBe(false);
  });

  it("INVALID_PHASE pre-match and at full time", () => {
    expect(evaluateSkipGates(liveState({ statusId: STATUS.PRE_MATCH }), prefs(), ctx()).reason).toBe(
      "INVALID_PHASE",
    );
    expect(evaluateSkipGates(liveState({ statusId: STATUS.FULL_TIME }), prefs(), ctx()).reason).toBe(
      "INVALID_PHASE",
    );
    expect(evaluateSkipGates(liveState({ statusId: null }), prefs(), ctx()).reason).toBe(
      "INVALID_PHASE",
    );
  });

  it("INVALID_PHASE during the opening warmup window", () => {
    const r = evaluateSkipGates(
      liveState({ clock: { seconds: 2 * 60, running: true } }),
      prefs(),
      ctx(),
    );
    expect(r).toMatchObject({ skip: true, reason: "INVALID_PHASE" });
    expect(r.detail).toContain("warmup");
  });

  it("MARKET_CLOSED from context or state flag", () => {
    expect(evaluateSkipGates(liveState(), prefs(), ctx({ marketClosed: true })).reason).toBe(
      "MARKET_CLOSED",
    );
    const s = liveState();
    s.flags.marketClosed = true;
    expect(evaluateSkipGates(s, prefs(), ctx()).reason).toBe("MARKET_CLOSED");
  });

  it("DATA_STALE when the last frame is older than the window", () => {
    const r = evaluateSkipGates(liveState({ updatedAt: NOW - 200_000 }), prefs(), ctx());
    expect(r.reason).toBe("DATA_STALE");
  });

  it("VAR_ACTIVE freezes recommendations", () => {
    const s = liveState();
    s.flags.varActive = true;
    expect(evaluateSkipGates(s, prefs(), ctx()).reason).toBe("VAR_ACTIVE");
  });

  it("UNCONFIRMED_GOAL freezes recommendations", () => {
    const s = liveState();
    s.flags.unconfirmedGoal = true;
    expect(evaluateSkipGates(s, prefs(), ctx()).reason).toBe("UNCONFIRMED_GOAL");
  });

  it("ODDS_UNAVAILABLE when there are no 1X2 odds", () => {
    expect(evaluateSkipGates(liveState({ odds1x2: undefined }), prefs(), ctx()).reason).toBe(
      "ODDS_UNAVAILABLE",
    );
  });

  it("ODDS_UNAVAILABLE when the odds frame itself is stale", () => {
    const s = liveState();
    s.odds1x2!.ts = NOW - 200_000;
    expect(evaluateSkipGates(s, prefs(), ctx()).reason).toBe("ODDS_UNAVAILABLE");
  });

  it("DAILY_LOSS_LIMIT when the day's loss reaches the cap", () => {
    const r = evaluateSkipGates(liveState(), prefs({ maxDailyVirtualLoss: 100 }), ctx({ dailyLoss: 100 }));
    expect(r.reason).toBe("DAILY_LOSS_LIMIT");
  });

  it("ALREADY_BET when a bet already exists on this market", () => {
    expect(evaluateSkipGates(liveState(), prefs(), ctx({ alreadyBet: true })).reason).toBe(
      "ALREADY_BET",
    );
  });
});
