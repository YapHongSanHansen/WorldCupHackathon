import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { navigate } from "@/lib/router";
import ReplayControls from "@/components/ReplayControls";
import { phaseLabel } from "@/lib/replay";
import { fmtClock } from "@/lib/utils";

/** Simulation dashboard: fixture selector + engine controls in one place. */
export default function Replay() {
  const { fixtures, replay, loadFixture } = useStore();
  const { timeline, state } = replay;

  return (
    <section className="mx-auto max-w-6xl px-4 pt-32 pb-20 sm:px-6">
      <p className="mb-2 font-mono text-[11px] tracking-[0.25em] text-blue uppercase">
        ● Simulation dashboard · operator view
      </p>
      <h1 className="font-serif text-4xl tracking-tight text-blue-ink">
        Replay <span className="italic text-blue">engine.</span>
      </h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* fixture selector */}
        <div className="border border-hairline">
          <p className="border-b border-hairline bg-blue-faint px-5 py-2.5 font-mono text-[11px] tracking-[0.2em] text-blue uppercase">
            Select fixture
          </p>
          {fixtures.map((f) => {
            const activeFixture = timeline?.fixtureId === f.fixtureId;
            return (
              <button
                key={f.fixtureId}
                onClick={() => void loadFixture(f.fixtureId)}
                className={`flex w-full cursor-pointer items-center justify-between border-b border-hairline px-5 py-3.5 text-left last:border-b-0 hover:bg-blue-faint ${
                  activeFixture ? "bg-blue-wash" : ""
                }`}
              >
                <span>
                  <span className="block text-[14px] font-semibold text-blue-ink">
                    {f.home.code} vs {f.away.code}
                  </span>
                  <span className="font-mono text-[10.5px] text-blue-mid">#{f.fixtureId}</span>
                </span>
                {activeFixture && <span className="font-mono text-[11px] text-blue">● loaded</span>}
              </button>
            );
          })}
        </div>

        {/* engine state */}
        <div className="flex flex-col gap-6">
          <div className="border border-hairline p-5">
            <p className="mb-4 font-mono text-[11px] tracking-[0.2em] text-blue uppercase">
              Engine controls
            </p>
            <ReplayControls />
          </div>

          <div className="border border-hairline p-5">
            <p className="mb-3 font-mono text-[11px] tracking-[0.2em] text-blue uppercase">
              Engine state
            </p>
            {timeline && state ? (
              <div className="grid grid-cols-2 gap-px border border-hairline bg-hairline font-mono text-[11.5px]">
                {(
                  [
                    ["Fixture", `${timeline.home.code} v ${timeline.away.code}`],
                    ["Phase", phaseLabel(state.status)],
                    ["Score", `${state.score.home}-${state.score.away}`],
                    ["Clock", fmtClock(state.clock)],
                    ["Cursor", `${Math.round(replay.cursor)}s / ${timeline.durationSec}s`],
                    ["Odds", state.odds ? `${state.odds.h.toFixed(2)} / ${state.odds.d.toFixed(2)} / ${state.odds.a.toFixed(2)}` : "—"],
                  ] as Array<[string, string]>
                ).map(([k, v]) => (
                  <div key={k} className="flex justify-between bg-paper px-3 py-2">
                    <span className="text-blue-mid uppercase">{k}</span>
                    <span className="font-bold text-blue-ink">{v}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-mono text-[12px] text-blue-mid">No fixture loaded.</p>
            )}
            {timeline && (
              <Button
                className="mt-4 w-full"
                variant="outline"
                onClick={() => navigate(`/matches/${timeline.fixtureId}`)}
              >
                Open match centre →
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
