/**
 * `PressureEdgeV1` — the initial rule-based strategy (spec §11.7).
 *
 * 1. Run the mandatory SKIP gates (§11.5).
 * 2. Build model probabilities from recent pressure + score state (§11.7 step 1).
 * 3. Compare to the market implied probabilities (step 2).
 * 4. Pick the outcome with the highest positive edge, if it clears the mode's
 *    edge threshold and the user's confidence floor (steps 3-4). Else SKIP.
 *
 * Deterministic and explainable: the same state + preferences + context always
 * produce the same decision, and every BET/SKIP carries the numeric features
 * that drove it.
 */

import {
  SELECTIONS,
  type AgentContext,
  type AgentDecision,
  type BettingStrategy,
  type MatchState,
  type Selection,
  type UserPreferences,
} from "@wc/shared-types";
import { MODE_CONFIG } from "./config.js";
import {
  extractPressure,
  impliedProbabilities,
  selectionProb,
  type OutcomeProbabilities,
} from "./features.js";
import { computeModelInputs, modelProbabilities } from "./model.js";
import { evaluateSkipGates } from "./skipGates.js";
import { suggestStake } from "./stake.js";

const STRATEGY_NAME = "PressureEdgeV1";

function selectionOdds(state: MatchState, s: Selection): number | undefined {
  const o = state.odds1x2;
  if (!o) return undefined;
  return s === "Home" ? o.home : s === "Draw" ? o.draw : o.away;
}

function skip(
  fixtureId: string,
  reason: AgentDecision["skipReason"],
  detail: string,
  features: AgentDecision["features"],
): AgentDecision {
  return {
    type: "SKIP",
    strategyName: STRATEGY_NAME,
    fixtureId,
    market: "1X2",
    confidence: 0,
    suggestedStake: 0,
    reason: detail,
    skipReason: reason,
    features,
  };
}

export class PressureEdgeV1 implements BettingStrategy {
  readonly name = STRATEGY_NAME;

  evaluate(
    state: MatchState,
    preferences: UserPreferences,
    context: AgentContext,
  ): AgentDecision {
    const pressure = extractPressure(state);

    // Gate first — cheap, mandatory, and independent of the model.
    const gate = evaluateSkipGates(state, preferences, context);
    if (gate.skip) {
      return skip(state.fixtureId, gate.reason, gate.detail ?? gate.reason ?? "skip", {
        pressureShareHome: round(pressure.pressureShareHome, 3),
        windowEvents: pressure.windowEvents,
      });
    }

    // Gates guarantee odds are usable here.
    const implied = impliedProbabilities(state.odds1x2) as OutcomeProbabilities;
    const inputs = computeModelInputs(state, pressure);
    const model = modelProbabilities(inputs);
    const mode = MODE_CONFIG[preferences.mode];

    // Highest positive edge across the three outcomes.
    let best: { selection: Selection; edge: number; modelProb: number } | null = null;
    for (const s of SELECTIONS) {
      const edge = selectionProb(model, s) - selectionProb(implied, s);
      if (best === null || edge > best.edge) {
        best = { selection: s, edge, modelProb: selectionProb(model, s) };
      }
    }
    best = best!;

    const confidence = Math.round(best.modelProb * 100);
    const confidenceFloor = clampFloor(preferences.minConfidence + mode.confidenceFloorDelta);

    const features: AgentDecision["features"] = {
      selection: best.selection,
      edge: round(best.edge, 4),
      modelHome: round(model.home, 4),
      modelDraw: round(model.draw, 4),
      modelAway: round(model.away, 4),
      impliedHome: round(implied.home, 4),
      impliedDraw: round(implied.draw, 4),
      impliedAway: round(implied.away, 4),
      pressureShareHome: round(pressure.pressureShareHome, 3),
      windowEvents: pressure.windowEvents,
      minute: round(inputs.minute, 1),
      scoreHome: inputs.currentHome,
      scoreAway: inputs.currentAway,
      edgeThreshold: mode.edgeThreshold,
      confidenceFloor,
    };

    // No positive edge over market → nothing to back.
    if (best.edge < mode.edgeThreshold) {
      return skip(
        state.fixtureId,
        "NO_EDGE",
        `best edge ${(best.edge * 100).toFixed(1)}% (${best.selection}) below ${(
          mode.edgeThreshold * 100
        ).toFixed(0)}% threshold`,
        features,
      );
    }

    // Edge clears the bar but the model isn't confident enough for the user.
    if (confidence < confidenceFloor) {
      return skip(
        state.fixtureId,
        "LOW_CONFIDENCE",
        `confidence ${confidence}% below floor ${confidenceFloor}%`,
        features,
      );
    }

    const odds = selectionOdds(state, best.selection);
    const suggestedStake = suggestStake({
      confidence,
      maxStakePerBet: preferences.maxStakePerBet,
      modeFactor: mode.stakeFactor,
      availableBalance: context.availableBalance,
    });

    // Sizing collapsed to nothing (e.g. empty balance) — treat as skip.
    if (suggestedStake <= 0) {
      return skip(state.fixtureId, "DAILY_LOSS_LIMIT", "no stake available", features);
    }

    const potentialPayout = odds !== undefined ? round(suggestedStake * odds, 2) : undefined;
    const side =
      best.selection === "Home"
        ? "the home side"
        : best.selection === "Away"
          ? "the away side"
          : "a draw";

    return {
      type: "BET",
      strategyName: STRATEGY_NAME,
      fixtureId: state.fixtureId,
      market: "1X2",
      selection: best.selection,
      confidence,
      suggestedStake,
      simulatedOdds: odds,
      potentialPayout,
      reason:
        `Model backs ${side}: estimated ${confidence}% vs market ` +
        `${Math.round(selectionProb(implied, best.selection) * 100)}% ` +
        `(edge +${(best.edge * 100).toFixed(1)}%), driven by ` +
        `${Math.round(pressure.pressureShareHome * 100)}% home pressure share.`,
      features,
    };
  }
}

/** Shared singleton — the strategy is stateless. */
export const pressureEdgeV1 = new PressureEdgeV1();

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

function clampFloor(n: number): number {
  return Math.min(100, Math.max(0, n));
}
