import { describe, it, expect } from "vitest";
import {
  canTransition,
  isTerminalState,
  transition,
  InvalidTransitionError,
} from "@wc/shared-types";

describe("recommendation state machine (§28)", () => {
  it("allows the documented happy path", () => {
    const path = [
      "CREATED",
      "SENT",
      "AWAITING_CONFIRMATION",
      "CONFIRMED",
      "TRANSACTION_PENDING",
      "RECORDED_ON_CHAIN",
      "WON",
      "CLAIMED",
    ] as const;
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition(path[i]!, path[i + 1]!)).toBe(true);
    }
  });

  it("allows AWAITING_CONFIRMATION self-loop (change stake)", () => {
    expect(canTransition("AWAITING_CONFIRMATION", "AWAITING_CONFIRMATION")).toBe(true);
  });

  it("allows tx failure back to AWAITING_CONFIRMATION", () => {
    expect(canTransition("TRANSACTION_PENDING", "AWAITING_CONFIRMATION")).toBe(true);
  });

  it("rejects skipping tx-pending (AWAITING_CONFIRMATION -> RECORDED_ON_CHAIN)", () => {
    expect(canTransition("AWAITING_CONFIRMATION", "RECORDED_ON_CHAIN")).toBe(false);
  });

  it("rejects REJECTED -> CONFIRMED and RECORDED_ON_CHAIN -> CREATED", () => {
    expect(canTransition("REJECTED", "CONFIRMED")).toBe(false);
    expect(canTransition("RECORDED_ON_CHAIN", "CREATED")).toBe(false);
  });

  it("rejects claiming a lost bet (LOST -> CLAIMED) and EXPIRED -> TRANSACTION_PENDING", () => {
    expect(canTransition("LOST", "CLAIMED")).toBe(false);
    expect(canTransition("EXPIRED", "TRANSACTION_PENDING")).toBe(false);
  });

  it("transition() returns the target on valid edges and throws otherwise", () => {
    expect(transition("WON", "CLAIMED")).toBe("CLAIMED");
    expect(() => transition("LOST", "CLAIMED")).toThrow(InvalidTransitionError);
  });

  it("marks terminal states", () => {
    for (const s of ["REJECTED", "EXPIRED", "LOST", "VOID", "CLAIMED"] as const) {
      expect(isTerminalState(s)).toBe(true);
    }
    expect(isTerminalState("RECORDED_ON_CHAIN")).toBe(false);
  });
});
