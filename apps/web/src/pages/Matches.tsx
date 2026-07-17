import MatchCard from "@/components/MatchCard";
import { useStore } from "@/store";
import { navigate } from "@/lib/router";

export default function Matches() {
  const { fixtures, loadFixture, replay } = useStore();

  return (
    <section className="mx-auto max-w-6xl px-4 pt-32 pb-20 sm:px-6">
      <p className="mb-2 font-mono text-[11px] tracking-[0.25em] text-blue uppercase">
        ● World Cup fixtures — captured feed
      </p>
      <h1 className="font-serif text-4xl tracking-tight text-blue-ink">
        Today's <span className="italic text-blue">matches.</span>
      </h1>
      <p className="mt-2 max-w-xl text-[14px] text-blue-ink/70">
        Six real TxLINE captures, replayed as if live. Pick a ticket to enter the match centre —
        the agent starts watching as soon as the replay runs.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {fixtures.map((f, i) => (
          <MatchCard
            key={f.fixtureId}
            fixture={f}
            index={i}
            onOpen={async () => {
              // don't reset a replay that's already loaded/live for this fixture
              if (replay.timeline?.fixtureId !== f.fixtureId) {
                await loadFixture(f.fixtureId);
              }
              navigate(`/matches/${f.fixtureId}`);
            }}
          />
        ))}
      </div>
      {fixtures.length === 0 && (
        <p className="mt-12 text-center font-mono text-[12px] text-blue-mid">
          Loading fixture catalogue…
        </p>
      )}
    </section>
  );
}
