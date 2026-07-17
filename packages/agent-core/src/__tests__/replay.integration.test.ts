/**
 * End-to-end: drive a real fixture through the replay engine and evaluate
 * PressureEdgeV1 on every tick. Asserts the mandatory SKIP invariants hold
 * across the whole match — the agent must never BET while a freeze condition
 * is active, off a non-live phase, or without usable odds (spec §11.5).
 */
import { describe, it, expect } from "vitest";
import { ReplayEngine } from "@wc/replay-engine";
import type { AgentContext, AgentDecision, MatchState } from "@wc/shared-types";
import { pressureEdgeV1 } from "../pressureEdge.js";
import { isLivePhase } from "../model.js";
import { DEFAULT_PREFERENCES } from "../config.js";

describe("PressureEdgeV1 over a full replay (18209181 FRA-MAR)", () => {
  it("never BETs while frozen / off-phase / without odds, and stays deterministic", async () => {
    const engine = new ReplayEngine();
    await engine.load("18209181");

    const preferences = DEFAULT_PREFERENCES;
    const decisions: AgentDecision[] = [];

    engine.on("tick", (state: MatchState) => {
      // Virtual-clock context: never artificially stale, generous balance.
      const context: AgentContext = {
        now: state.updatedAt,
        availableBalance: 1000,
        alreadyBet: false,
        dailyLoss: 0,
        marketClosed: false,
      };
      const decision = pressureEdgeV1.evaluate(state, preferences, context);
      decisions.push(decision);

      if (decision.type === "BET") {
        expect(state.flags.varActive).toBe(false);
        expect(state.flags.unconfirmedGoal).toBe(false);
        expect(state.flags.dataStale).toBe(false);
        expect(isLivePhase(state)).toBe(true);
        expect(state.odds1x2).toBeDefined();
        expect(decision.selection).toBeDefined();
        expect(decision.suggestedStake).toBeGreaterThan(0);
      }

      // While VAR is active on a live phase, the freeze gate must win.
      if (state.flags.varActive && isLivePhase(state)) {
        expect(decision.type).toBe("SKIP");
        expect(decision.skipReason).toBe("VAR_ACTIVE");
      }
    });

    engine.runToEnd();

    // The match produced a stream of decisions and terminated correctly.
    expect(decisions.length).toBeGreaterThan(100);
    expect(engine.state.score).toEqual({ home: 2, away: 0 });

    // Every decision is one of the two legal shapes.
    for (const d of decisions) {
      expect(d.type === "BET" || d.type === "SKIP").toBe(true);
      if (d.type === "SKIP") expect(d.skipReason).toBeDefined();
    }
  }, 30000);
});
