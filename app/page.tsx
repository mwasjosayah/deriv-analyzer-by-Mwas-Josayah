"use client";

import { useEffect, useMemo, useState } from "react";

import MarketCard from "../components/MarketCard";
import TopSignals from "../components/TopSignals";
import DigitStats from "../components/DigitStats";
import RecentTicks from "../components/RecentTicks";
import SignalHistory from "../components/SignalHistory";

import { DerivDataManager } from "../lib/deriv-data";

const DEFAULT_SYMBOL = "R_100";

export default function Home() {
  const [digits, setDigits] = useState<number[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const dataManager = useMemo(
    () =>
      new DerivDataManager({
        maxTicks: 500,
      }),
    []
  );

  useEffect(() => {
    dataManager.connect(DEFAULT_SYMBOL);

    const unsubscribe = dataManager.onDigit((digit) => {
      setDigits((previous) => {
        const updated = [...previous, digit];

        return updated.slice(-500);
      });

      setIsConnected(true);
    });

    return () => {
      unsubscribe();
      dataManager.disconnect();
    };
  }, [dataManager]);

  const latestDigits = digits.slice(-20);

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Deriv Analysis</h1>
          <p>
            Live market analysis and prediction dashboard
          </p>
        </div>

        <div
          className={`connection-status ${
            isConnected ? "connected" : "disconnected"
          }`}
        >
          <span className="status-dot" />
          {isConnected ? "Live" : "Connecting..."}
        </div>
      </header>

      <section className="market-selector">
        <div>
          <span className="selector-label">
            Market
          </span>

          <select defaultValue={DEFAULT_SYMBOL}>
            <option value="R_100">
              Volatility 100 Index
            </option>

            <option value="R_75">
              Volatility 75 Index
            </option>

            <option value="R_50">
              Volatility 50 Index
            </option>

            <option value="R_25">
              Volatility 25 Index
            </option>

            <option value="R_10">
              Volatility 10 Index
            </option>

            <option value="1HZ100V">
              Volatility 100 (1s) Index
            </option>

            <option value="1HZ75V">
              Volatility 75 (1s) Index
            </option>

            <option value="1HZ50V">
              Volatility 50 (1s) Index
            </option>

            <option value="1HZ25V">
              Volatility 25 (1s) Index
            </option>

            <option value="1HZ10V">
              Volatility 10 (1s) Index
            </option>
          </select>
        </div>
      </section>

      <section className="market-grid">
        <MarketCard
          market="Over 2"
          symbol="Volatility 100 Index"
          prediction="OVER 2"
          confidence={0}
          status="WAIT"
        />

        <MarketCard
          market="Under 7"
          symbol="Volatility 100 Index"
          prediction="UNDER 7"
          confidence={0}
          status="WAIT"
        />

        <MarketCard
          market="Even"
          symbol="Volatility 100 Index"
          prediction="EVEN"
          confidence={0}
          status="WAIT"
        />

        <MarketCard
          market="Odd"
          symbol="Volatility 100 Index"
          prediction="ODD"
          confidence={0}
          status="WAIT"
        />

        <MarketCard
          market="Matches"
          symbol="Volatility 100 Index"
          prediction="MATCHES"
          confidence={0}
          status="WAIT"
        />

        <MarketCard
          market="Differs"
          symbol="Volatility 100 Index"
          prediction="DIFFERS"
          confidence={0}
          status="WAIT"
        />
      </section>

      <TopSignals signals={[]} />

      <DigitStats
        digits={Array.from({ length: 10 }, (_, digit) =>
          digits.filter((value) => value === digit).length
        )}
      />

      <RecentTicks digits={latestDigits} />

      <SignalHistory signals={[]} />

      <footer className="dashboard-footer">
        Analysis made by <strong>Mwas Josayah</strong>
      </footer>
    </main>
  );
}
