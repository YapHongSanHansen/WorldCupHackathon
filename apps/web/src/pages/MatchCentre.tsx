import { useEffect } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/store";
import { phaseLabel } from "@/lib/replay";
import { fmtClock } from "@/lib/utils";
import ReplayControls from "@/components/ReplayControls";
import OddsSpark from "@/components/OddsSpark";
import AgentPanel from "@/components/AgentPanel";

const EVENT_ICON: Record<string, string> = {
  goal: "⚽",
  shot: "🎯",
  corner: "◤",
  yellow_card: "▮",
  red_card: "▮",
  var: "⏳",
  var_end: "✓",
  penalty: "⊙",
  substitution: "⇄",
  kickoff: "▶",
  game_finalised: "■",
  halftime_finalised: "◼",
};

export default function MatchCentre({ fixtureId }: { fixtureId: string }) {
  const { replay, loadFixture } = useStore();
  const { state, timeline } = replay;

  useEffect(() => {
    if (!timeline || timeline.fixtureId !== fixtureId) {
      void loadFixture(fixtureId);
    }
  }, [fixtureId, timeline, loadFixture]);

  if (!timeline || timeline.fixtureId !== fixtureId || !state) {
    return (
      <section className="mx-auto max-w-6xl px-4 pt-36 text-center font-mono text-[12px] text-blue-mid">
        Loading fixture #{fixtureId}…
      </section>
    );
  }

  const events = [...state.recent].reverse();

  return (
    <section className="mx-auto max-w-6xl px-4 pt-32 pb-20 sm:px-6">
      {/* scoreboard */}
      <div className="border border-hairline">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-blue-faint px-5 py-2.5">
          <span className="font-mono text-[11px] tracking-[0.2em] text-blue uppercase">
            Match centre · #{fixtureId} · replayed capture
          </span>
          <span className="font-mono text-[11px] font-bold text-blue">
            {phaseLabel(state.status)} {state.varActive && "· VAR"}
            {state.unconfirmedGoal && "· GOAL CHECK"}
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-6">
          <div className="text-right">
            <p className="font-serif text-2xl tracking-tight text-blue-ink sm:text-3xl">
              {timeline.home.name}
            </p>
            <p className="font-mono text-[11px] text-blue-mid">{timeline.home.code} · HOME</p>
          </div>
          <div className="text-center">
            <motion.p
              key={`${state.score.home}-${state.score.away}`}
              initial={{ scale: 1.25 }}
              animate={{ scale: 1 }}
              className="font-mono text-5xl font-bold text-blue"
            >
              {state.score.home}–{state.score.away}
            </motion.p>
            <p className="mt-1 font-mono text-[12px] text-blue-ink/60">
              ⏱ {fmtClock(state.clock)} {state.running ? "" : "(stopped)"}
            </p>
          </div>
          <div>
            <p className="font-serif text-2xl tracking-tight text-blue-ink sm:text-3xl">
              {timeline.away.name}
            </p>
            <p className="font-mono text-[11px] text-blue-mid">{timeline.away.code} · AWAY</p>
          </div>
        </div>
        <div className="border-t border-hairline px-5 py-3">
          <ReplayControls />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* left column: odds + timeline */}
        <div className="flex flex-col gap-6">
          <div className="border border-hairline p-5">
            <p className="mb-3 font-mono text-[11px] tracking-[0.2em] text-blue uppercase">
              1X2 odds movement · simulated
            </p>
            <OddsSpark odds={timeline.odds} cursor={replay.cursor} />
          </div>

          <div className="border border-hairline">
            <p className="border-b border-hairline bg-blue-faint px-5 py-2.5 font-mono text-[11px] tracking-[0.2em] text-blue uppercase">
              Event timeline
            </p>
            <ul className="max-h-[340px] overflow-y-auto">
              {events.length === 0 && (
                <li className="px-5 py-6 text-center font-mono text-[11.5px] text-blue-mid">
                  Start the replay to stream match events.
                </li>
              )}
              {events.map((ev, i) => (
                <li
                  key={`${ev.t}-${i}`}
                  className="flex items-center gap-3 border-b border-hairline px-5 py-2 font-mono text-[11.5px] last:border-b-0"
                >
                  <span className="w-12 shrink-0 text-blue-mid">{fmtClock(ev.clock)}</span>
                  <span className="w-5 shrink-0 text-center">{EVENT_ICON[ev.action] ?? "·"}</span>
                  <span className="flex-1 text-blue-ink/80">
                    {ev.action.replace(/_/g, " ")}
                    {ev.p === 1 && ` — ${timeline.home.code}`}
                    {ev.p === 2 && ` — ${timeline.away.code}`}
                    {ev.conf === false && " (unconfirmed)"}
                  </span>
                  <span className="shrink-0 font-bold text-blue">
                    {ev.h}-{ev.a}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* right column: agent */}
        <div className="border border-hairline p-5">
          <AgentPanel fixtureId={fixtureId} />
        </div>
      </div>
    </section>
  );
}
