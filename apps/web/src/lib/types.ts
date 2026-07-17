// Lightweight mirrors of the API's response shapes (apps/api). Kept local so the
// web build doesn't pull in server code.

export type Selection = "Home" | "Draw" | "Away";
export type ReplayStatus = "IDLE" | "RUNNING" | "PAUSED" | "COMPLETED";
export type ReplaySpeed = 1 | 10 | 30 | 60;

export type RecommendationState =
  | "CREATED"
  | "SENT"
  | "AWAITING_CONFIRMATION"
  | "CONFIRMED"
  | "REJECTED"
  | "EXPIRED"
  | "TRANSACTION_PENDING"
  | "RECORDED_ON_CHAIN"
  | "WON"
  | "LOST"
  | "VOID"
  | "CLAIMED";

export interface MatchState {
  fixtureId: string;
  statusId: number | null;
  clock: { seconds: number; running: boolean };
  score: { home: number; away: number };
  stats: Record<string, number>;
  odds1x2?: {
    home: number;
    draw: number;
    away: number;
    homePct?: number;
    drawPct?: number;
    awayPct?: number;
    ts: number;
  };
  flags: {
    varActive: boolean;
    unconfirmedGoal: boolean;
    dataStale: boolean;
    marketClosed: boolean;
  };
  updatedAt: number;
}

export interface FixtureView {
  fixtureId: string;
  homeTeam: string;
  awayTeam: string;
  status: ReplayStatus;
  speed: ReplaySpeed;
  state: MatchState | null;
  marketId: number | null;
}

export interface AgentDecision {
  type: "BET" | "SKIP";
  strategyName: string;
  confidence: number;
  suggestedStake: number;
  simulatedOdds?: number;
  potentialPayout?: number;
  reason: string;
  selection?: Selection;
  features: Record<string, number | string | boolean>;
}

export interface Recommendation {
  id: string;
  fixtureId: string;
  marketId: number;
  createdAt: number;
  expiresAt: number;
  state: RecommendationState;
  decision: AgentDecision;
  selection: Selection;
  stake: number;
  simulatedOdds: number;
  betId?: string;
  txSignature?: string;
  result?: "WON" | "LOST" | "VOID";
  payout?: number;
}

export interface BetRecord {
  id: string;
  recommendationId: string;
  fixtureId: string;
  marketId: number;
  selection: Selection;
  stake: number;
  odds: number;
  potentialPayout: number;
  state: RecommendationState;
  placedAt: number;
  txSignature: string;
  payout?: number;
}

export interface PortfolioView {
  wallet: string;
  balance: number;
  staked: number;
  bets: BetRecord[];
  realisedPnl: number;
  dailyLoss: number;
}
