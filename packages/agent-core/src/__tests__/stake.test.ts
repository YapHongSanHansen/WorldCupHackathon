import { describe, it, expect } from "vitest";
import { suggestStake } from "../stake.js";

describe("suggestStake (§11.6)", () => {
  it("follows rawStake = maxStake * confidence * modeFactor, rounded", () => {
    // 50 * 0.60 * 1.0 = 30
    expect(suggestStake({ confidence: 60, maxStakePerBet: 50, modeFactor: 1, availableBalance: 1000 })).toBe(30);
  });

  it("caps at maxStakePerBet", () => {
    // raw 50*0.9*1.25 = 56.25 -> capped to 50
    expect(suggestStake({ confidence: 90, maxStakePerBet: 50, modeFactor: 1.25, availableBalance: 10000 })).toBe(50);
  });

  it("caps at 10% of available balance", () => {
    // raw 50*0.8*1 = 40, but balance 200 -> cap 20
    expect(suggestStake({ confidence: 80, maxStakePerBet: 50, modeFactor: 1, availableBalance: 200 })).toBe(20);
  });

  it("conservative mode halves the stake", () => {
    // 50 * 0.60 * 0.5 = 15
    expect(suggestStake({ confidence: 60, maxStakePerBet: 50, modeFactor: 0.5, availableBalance: 1000 })).toBe(15);
  });

  it("never returns negative", () => {
    expect(suggestStake({ confidence: 0, maxStakePerBet: 50, modeFactor: 1, availableBalance: 0 })).toBe(0);
  });
});
