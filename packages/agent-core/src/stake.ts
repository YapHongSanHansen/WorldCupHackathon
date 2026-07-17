/**
 * Stake sizing — spec §11.6.
 *
 *   rawStake       = maxStakePerBet * (confidence/100) * modeFactor
 *   suggestedStake = roundTo1(min(rawStake, maxStakePerBet, availableBalance * 0.1))
 *
 * The `availableBalance * 0.1` cap keeps any single simulated bet to at most a
 * tenth of the wallet. Rounded to whole WCDT (the on-chain program takes an
 * integer stake in base units; whole-token amounts keep the demo readable).
 */

const roundTo1 = (n: number): number => Math.round(n);

export interface StakeInputs {
  confidence: number; // 0-100
  maxStakePerBet: number;
  modeFactor: number;
  availableBalance: number;
}

export function suggestStake(inputs: StakeInputs): number {
  const { confidence, maxStakePerBet, modeFactor, availableBalance } = inputs;
  const rawStake = maxStakePerBet * (confidence / 100) * modeFactor;
  const capped = Math.min(rawStake, maxStakePerBet, availableBalance * 0.1);
  return Math.max(0, roundTo1(capped));
}
