"use client";

import { api } from "@/lib/api";
import { useSim } from "@/lib/store";
import { minute, phaseLabel } from "@/lib/format";
import type { FixtureView, ReplaySpeed } from "@/lib/types";
import { RecommendationCard } from "./RecommendationCard";

const SPEEDS: ReplaySpeed[] = [1, 10, 30, 60];

const STATUS_BADGE: Record<FixtureView["status"], string> = {
  IDLE: "bg-white/5 text-emerald-100/50",
  RUNNING: "bg-grass-600/20 text-grass-400",
  PAUSED: "bg-amber-400/10 text-gold",
  COMPLETED: "bg-sky-400/10 text-sky-300",
};

export function FixtureCard({ fixture }: { fixture: FixtureView }) {
  const { recommendations, refresh } = useSim();
  const s = fixture.state;
  const odds = s?.odds1x2;

  const activeRec = Object.values(recommendations)
    .filter((r) => r.fixtureId === fixture.fixtureId)
    .sort((a, b) => b.createdAt - a.createdAt)[0];

  const control = async (action: string, speed?: ReplaySpeed) => {
    try {
      await api.replay(fixture.fixtureId, action, speed);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-400/10 bg-pitch-900/70">
      <div className="flex items-center justify-between border-b border-emerald-400/10 px-4 py-2.5">
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[fixture.status]}`}>
          {fixture.status === "RUNNING" && <span className="mr-1 live-dot">●</span>}
          {fixture.status}
        </span>
        <span className="text-xs text-emerald-100/40">
          {phaseLabel(s?.statusId ?? null)} · {minute(s)}
        </span>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <TeamName name={fixture.homeTeam} align="left" />
          <div className="mx-3 shrink-0 text-center">
            <div className="font-mono text-3xl font-bold tracking-tight">
              {s ? `${s.score.home} - ${s.score.away}` : "0 - 0"}
            </div>
          </div>
          <TeamName name={fixture.awayTeam} align="right" />
        </div>

        {odds ? (
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <OddPill label={fixture.homeTeam} value={odds.home} />
            <OddPill label="Draw" value={odds.draw} />
            <OddPill label={fixture.awayTeam} value={odds.away} />
          </div>
        ) : (
          <div className="mt-4 text-center text-xs text-emerald-100/30">Odds load once the replay starts</div>
        )}

        {(s?.flags.varActive || s?.flags.unconfirmedGoal) && (
          <div className="mt-3 rounded-lg bg-amber-400/10 px-3 py-1.5 text-center text-xs font-medium text-gold">
            {s.flags.varActive ? "VAR in progress — recommendations frozen" : "Unconfirmed goal — frozen"}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {fixture.status === "IDLE" || fixture.status === "COMPLETED" ? (
            <ControlBtn onClick={() => control("start", 30)} primary>
              ▶ Start
            </ControlBtn>
          ) : fixture.status === "RUNNING" ? (
            <ControlBtn onClick={() => control("pause")}>❚❚ Pause</ControlBtn>
          ) : (
            <ControlBtn onClick={() => control("resume")} primary>
              ▶ Resume
            </ControlBtn>
          )}
          <ControlBtn onClick={() => control("step")}>⏭ Step</ControlBtn>

          <div className="ml-auto flex items-center gap-1 text-xs">
            {SPEEDS.map((sp) => (
              <button
                key={sp}
                onClick={() => control("setSpeed", sp)}
                className={`rounded-md px-2 py-1 font-mono transition ${
                  fixture.speed === sp
                    ? "bg-grass-600/25 text-grass-400"
                    : "text-emerald-100/40 hover:text-emerald-100"
                }`}
              >
                {sp}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {activeRec && (
        <div className="border-t border-emerald-400/10 bg-pitch-950/40 p-3">
          <RecommendationCard rec={activeRec} home={fixture.homeTeam} away={fixture.awayTeam} />
        </div>
      )}
    </div>
  );
}

function TeamName({ name, align }: { name: string; align: "left" | "right" }) {
  return (
    <div className={`flex-1 ${align === "right" ? "text-right" : "text-left"}`}>
      <div className="truncate text-sm font-semibold sm:text-base">{name}</div>
    </div>
  );
}

function OddPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-emerald-400/10 bg-pitch-800/60 py-1.5">
      <div className="truncate px-1 text-[10px] uppercase tracking-wide text-emerald-100/40">{label}</div>
      <div className="font-mono text-sm font-semibold text-emerald-100">{value.toFixed(2)}</div>
    </div>
  );
}

function ControlBtn({
  children,
  onClick,
  primary,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        primary
          ? "bg-grass-600 text-pitch-950 hover:bg-grass-500"
          : "border border-emerald-400/15 text-emerald-100/70 hover:bg-white/5"
      }`}
    >
      {children}
    </button>
  );
}
