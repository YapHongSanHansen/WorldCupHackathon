import { describe, it, expect } from "vitest";
import { pressureEdgeV1 } from "../pressureEdge.js";
import { extractPressure } from "../features.js";
import { computeModelInputs, modelProbabilities } from "../model.js";
import { liveState, ctx, prefs, NOW } from "./helpers.js";

describe("PressureEdgeV1.evaluate (§11.7)", () => {
  it("BETs the leader when the model beats the market by more than the threshold", () => {
    // Home 1-0 at 60' with a market that only prices home at ~47% -> positive edge.
    const d = pressureEdgeV1.evaluate(liveState(), prefs(), ctx());
    expect(d.type).toBe("BET");
    expect(d.selection).toBe("Home");
    expect(d.confidence).toBeGreaterThanOrEqual(55);
    expect(d.suggestedStake).toBeGreaterThan(0);
    expect(d.simulatedOdds).toBe(2.0);
    expect(d.potentialPayout).toBeCloseTo(d.suggestedStake * 2.0, 2);
    expect(d.features.selection).toBe("Home");
  });

  it("returns SKIP (not a throw) and a machine-readable reason on a frozen state", () => {
    const s = liveState();
    s.flags.varActive = true;
    const d = pressureEdgeV1.evaluate(s, prefs(), ctx());
    expect(d.type).toBe("SKIP");
    expect(d.skipReason).toBe("VAR_ACTIVE");
    expect(d.suggestedStake).toBe(0);
  });

  it("SKIPs with NO_EDGE when the market implied probs match the model", () => {
    const s = liveState();
    // Price the market to exactly the model's own probabilities -> every edge
    // is ~0, so no outcome clears the threshold.
    const m = modelProbabilities(computeModelInputs(s, extractPressure(s)));
    s.odds1x2 = {
      home: 1 / m.home,
      draw: 1 / m.draw,
      away: 1 / m.away,
      homePct: m.home * 100,
      drawPct: m.draw * 100,
      awayPct: m.away * 100,
      ts: NOW,
    };
    const d = pressureEdgeV1.evaluate(s, prefs(), ctx());
    expect(d.type).toBe("SKIP");
    expect(d.skipReason).toBe("NO_EDGE");
  });

  it("SKIPs with LOW_CONFIDENCE when the confidence floor is very high", () => {
    const d = pressureEdgeV1.evaluate(liveState(), prefs({ minConfidence: 99 }), ctx());
    expect(d.type).toBe("SKIP");
    expect(d.skipReason).toBe("LOW_CONFIDENCE");
  });

  it("conservative mode stakes less than aggressive on the same state", () => {
    const cons = pressureEdgeV1.evaluate(liveState(), prefs({ mode: "conservative" }), ctx());
    const aggr = pressureEdgeV1.evaluate(liveState(), prefs({ mode: "aggressive" }), ctx());
    expect(cons.type).toBe("BET");
    expect(aggr.type).toBe("BET");
    expect(cons.suggestedStake).toBeLessThan(aggr.suggestedStake);
  });

  it("is deterministic for identical inputs", () => {
    const a = pressureEdgeV1.evaluate(liveState(), prefs(), ctx());
    const b = pressureEdgeV1.evaluate(liveState(), prefs(), ctx());
    expect(a).toEqual(b);
  });
});
