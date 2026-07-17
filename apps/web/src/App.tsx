import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Home from "@/pages/Home";
import Matches from "@/pages/Matches";
import MatchCentre from "@/pages/MatchCentre";
import Confirm from "@/pages/Confirm";
import Portfolio from "@/pages/Portfolio";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import Replay from "@/pages/Replay";
import { useState } from "react";
import Loader from "@/components/Loader";
import GoalIntro from "@/components/GoalIntro";
import { useRoute } from "@/lib/router";
import { StoreProvider } from "@/store";

function Router() {
  const { parts } = useRoute();
  const [head, arg] = [parts[0], parts[1]];

  if (!head) return <Home />;
  if (head === "matches" && arg) return <MatchCentre fixtureId={arg} />;
  if (head === "matches") return <Matches />;
  if (head === "confirm" && arg) return <Confirm recId={arg} />;
  if (head === "portfolio") return <Portfolio />;
  if (head === "history") return <History />;
  if (head === "settings") return <Settings />;
  if (head === "replay") return <Replay />;
  return <Home />;
}

type Stage = "loader" | "goal" | "ready";

export default function App() {
  const { parts } = useRoute();
  const [stage, setStage] = useState<Stage>("loader");

  const isHome = parts.length === 0;

  return (
    <StoreProvider>
      {stage === "loader" && (
        <Loader onDone={() => setStage(isHome ? "goal" : "ready")} />
      )}
      {stage === "goal" && <GoalIntro onDone={() => setStage("ready")} />}
      <main className="relative flex min-h-screen flex-col">
        <Navbar />
        <div className="flex-1">
          <Router />
        </div>
        <Footer />
      </main>
    </StoreProvider>
  );
}
