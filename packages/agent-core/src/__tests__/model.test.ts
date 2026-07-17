import { describe, it, expect } from "vitest";
import { extractPressure } from "../features.js";
import { computeModelInputs, modelProbabilities } from "../model.js";
import { liveState, event } from "./helpers.js";

describe("probability model (§11.7)", () => {
  it("a late lead concentrates probability on the leader", () => {
    const early = liveState({ clock: { seconds: 10 * 60, running: true }, score: { home: 1, away: 0 } });
    const late = liveState({ clock: { seconds: 85 * 60, running: true }, score: { home: 1, away: 0 } });
    const pE = modelProbabilities(computeModelInputs(early, extractPressure(early)));
    const pL = modelProbabilities(computeModelInputs(late, extractPressure(late)));
    // Same 1-0 lead, but with less time left the home win probability is higher.
    expect(pL.home).toBeGreaterThan(pE.home);
    expect(pL.home).toBeGreaterThan(0.7);
  });

  it("level and late favours the draw over an early level score", () => {
    const early = liveState({ clock: { seconds: 10 * 60, running: true }, score: { home: 0, away: 0 } });
    const late = liveState({ clock: { seconds: 88 * 60, running: true }, score: { home: 0, away: 0 } });
    const pE = modelProbabilities(computeModelInputs(early, extractPressure(early)));
    const pL = modelProbabilities(computeModelInputs(late, extractPressure(late)));
    expect(pL.draw).toBeGreaterThan(pE.draw);
  });

  it("recent pressure tilts probability toward the pressing side", () => {
    const base = liveState({ score: { home: 0, away: 0 } });
    const homePressing = liveState({
      score: { home: 0, away: 0 },
      recentEvents: [
        event("high_danger_possession", 1),
        event("shot", 1),
        event("corner", 1),
        event("danger_possession", 1),
      ],
    });
    const pBase = modelProbabilities(computeModelInputs(base, extractPressure(base)));
    const pHome = modelProbabilities(computeModelInputs(homePressing, extractPressure(homePressing)));
    expect(pHome.home).toBeGreaterThan(pBase.home);
    expect(pHome.away).toBeLessThan(pBase.away);
  });

  it("probabilities always sum to 1", () => {
    const s = liveState();
    const p = modelProbabilities(computeModelInputs(s, extractPressure(s)));
    expect(p.home + p.draw + p.away).toBeCloseTo(1, 6);
  });
});

describe("extractPressure", () => {
  it("attributes weighted pressure by participant and defaults to 0.5 when empty", () => {
    expect(extractPressure(liveState()).pressureShareHome).toBe(0.5);
    const s = liveState({ recentEvents: [event("shot", 1), event("shot", 1), event("corner", 2)] });
    const f = extractPressure(s);
    expect(f.homeShots).toBe(2);
    expect(f.awayCorners).toBe(1);
    expect(f.pressureShareHome).toBeGreaterThan(0.5);
  });
});
