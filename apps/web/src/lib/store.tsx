"use client";

/**
 * Single client-side store: connects the Socket.IO stream once, seeds from REST,
 * and keeps fixtures / recommendations / portfolio live as events arrive.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { API_URL, api } from "./api";
import type {
  FixtureView,
  PortfolioView,
  Recommendation,
} from "./types";

interface SimState {
  connected: boolean;
  fixtures: Record<string, FixtureView>;
  recommendations: Record<string, Recommendation>;
  portfolio: PortfolioView | null;
  refresh: () => Promise<void>;
}

const SimContext = createContext<SimState | null>(null);

export function SimProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [fixtures, setFixtures] = useState<Record<string, FixtureView>>({});
  const [recommendations, setRecommendations] = useState<Record<string, Recommendation>>({});
  const [portfolio, setPortfolio] = useState<PortfolioView | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const refresh = useMemo(
    () => async () => {
      const [f, r, p] = await Promise.all([
        api.fixtures(),
        api.recommendations(),
        api.portfolio(),
      ]);
      setFixtures(Object.fromEntries(f.fixtures.map((x) => [x.fixtureId, x])));
      setRecommendations(Object.fromEntries(r.recommendations.map((x) => [x.id, x])));
      setPortfolio(p.portfolio);
    },
    [],
  );

  useEffect(() => {
    void refresh().catch(() => undefined);

    const socket = io(API_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("state", (e: { fixtureId: string; state: FixtureView["state"]; status: FixtureView["status"] }) => {
      setFixtures((prev) => {
        const cur = prev[e.fixtureId];
        if (!cur) return prev;
        return { ...prev, [e.fixtureId]: { ...cur, state: e.state, status: e.status } };
      });
    });
    socket.on("replay", (e: { fixtureId: string; status: FixtureView["status"]; speed: FixtureView["speed"] }) => {
      setFixtures((prev) => {
        const cur = prev[e.fixtureId];
        if (!cur) return prev;
        return { ...prev, [e.fixtureId]: { ...cur, status: e.status, speed: e.speed } };
      });
    });
    socket.on("recommendation", (e: { recommendation: Recommendation }) => {
      setRecommendations((prev) => ({ ...prev, [e.recommendation.id]: e.recommendation }));
    });
    socket.on("portfolio", (e: { portfolio: PortfolioView }) => setPortfolio(e.portfolio));

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [refresh]);

  const value: SimState = { connected, fixtures, recommendations, portfolio, refresh };
  return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
}

export function useSim(): SimState {
  const ctx = useContext(SimContext);
  if (!ctx) throw new Error("useSim must be used within SimProvider");
  return ctx;
}
