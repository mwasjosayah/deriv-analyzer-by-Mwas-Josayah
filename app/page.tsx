"use client";

import { useEffect, useState } from "react";
import MarketCard from "../components/MarketCard";
import TopSignals from "../components/TopSignals";
import DigitStats from "../components/DigitStats";
import RecentTicks from "../components/RecentTicks";
import SignalHistory from "../components/SignalHistory";
import { DerivAnalysisEngine } from "../lib/deriv-engine";
import { DerivDataManager } from "../lib/deriv-data";

export default function Home() {
  const [ticks, setTicks] = useState<number[]>([]);
  const [engine] = useState(() => new DerivAnalysisEngine(100));
  const [dataManager] = useState(
    () => new DerivDataManager(engine)
  );

  useEffect(() => {
    const unsubscribe = dataManager.onDigit((digit) => {
      setTicks(dataManager.getEngine().getTicks());
    });

    dataManager.connect("R_100");

    return () => {
      unsubscribe();
      dataManager.disconnect();
    };
  }, [dataManager]);

  const over2 = engine.analyze("OVER_2");
  const under7 = engine.analyze("UNDER_7");
  const even = engine.analyze("EVEN");
  const odd = engine.analyze("ODD");
  const matches = engine.analyze("MATCHES", 5);
  const differs = engine.analyze("DIFFERS", 5);

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Deriv Analysis</h1>
          <p>Market analysis and prediction dashboard</p>
        </div>

        <div className="connection-status">
          <span className="status-dot"></span>
          LIVE
        </div>
      </header>

      <section className="market-grid">
        <MarketCard
          market="Over 2"
          symbol="R_100"
          prediction={over2.prediction}
          confidence={over2.confidence}
          status={over2.valid ? "BUY" : "WAIT"}
        />

        <MarketCard
          market="Under 7"
          symbol="R_100"
          prediction={under7.prediction}
          confidence={under7.confidence}
          status={under7.valid ? "BUY" : "WAIT"}
        />

        <MarketCard
          market="Even"
          symbol="R_100"
          prediction={even.prediction}
          confidence={even.confidence}
          status={even.valid ? "BUY" : "WAIT"}
        />

        <MarketCard
          market="Odd"
          symbol="R_100"
          prediction={odd.prediction}
          confidence={odd.confidence}
          status={odd.valid ? "BUY" : "WAIT"}
        />

        <MarketCard
          market="Matches 5"
          symbol="R_100"
          prediction={matches.prediction}
          confidence={matches.confidence}
          status={matches.valid ? "BUY" : "WAIT"}
        />

        <MarketCard
          market="Differs 5"
          symbol="R_100"
          prediction={differs.prediction}
          confidence={differs.confidence}
          status={differs.valid ? "BUY" : "WAIT"}
        />
      </section>

      <section className="dashboard-section">
        <TopSignals />
      </section>

      <section className="dashboard-section">
        <DigitStats statistics={over2.statistics} />
      </section>

      <section className="dashboard-section">
        <RecentTicks ticks={ticks} />
      </section>

      <section className="dashboard-section">
        <SignalHistory />
      </section>

      <footer className="dashboard-footer">
        <p>Analysis made by Mwas Josayah</p>
      </footer>
    </main>
  );
}
