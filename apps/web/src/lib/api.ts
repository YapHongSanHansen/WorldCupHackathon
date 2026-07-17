import type {
  FixtureView,
  PortfolioView,
  Recommendation,
  ReplaySpeed,
} from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { error?: string }).error ?? res.statusText);
  return json as T;
}

export const api = {
  fixtures: () => req<{ fixtures: FixtureView[] }>("/api/fixtures"),
  fixture: (id: string) => req<{ fixture: FixtureView }>(`/api/fixtures/${id}`),
  replay: (id: string, action: string, speed?: ReplaySpeed) =>
    req<{ fixture: FixtureView }>(`/api/fixtures/${id}/replay`, {
      method: "POST",
      body: JSON.stringify({ action, speed }),
    }),
  recommendations: () =>
    req<{ recommendations: Recommendation[] }>("/api/recommendations"),
  confirm: (id: string, stake?: number) =>
    req<{ recommendation: Recommendation }>(`/api/recommendations/${id}/confirm`, {
      method: "POST",
      body: JSON.stringify({ stake }),
    }),
  reject: (id: string) =>
    req<{ recommendation: Recommendation }>(`/api/recommendations/${id}/reject`, {
      method: "POST",
      body: "{}",
    }),
  setStake: (id: string, stake: number) =>
    req<{ recommendation: Recommendation }>(`/api/recommendations/${id}/stake`, {
      method: "POST",
      body: JSON.stringify({ stake }),
    }),
  claim: (id: string) =>
    req<{ recommendation: Recommendation }>(`/api/recommendations/${id}/claim`, {
      method: "POST",
      body: "{}",
    }),
  portfolio: () => req<{ portfolio: PortfolioView }>("/api/portfolio"),
  faucet: (amount?: number) =>
    req<{ balance: number }>("/api/faucet", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
};
