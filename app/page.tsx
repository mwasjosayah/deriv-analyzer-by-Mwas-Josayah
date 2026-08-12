"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import MarketCard from "../components/MarketCard";
import TopSignals from "../components/TopSignals";
import DigitStats from "../components/DigitStats";
import RecentTicks from "../components/RecentTicks";
import SignalHistory from "../components/SignalHistory";

import { DerivDataManager } from "../lib/deriv-data";

const DEFAULT_SYMBOL = "R_100";

const DEFAULT_MARKET_NAME =
  "Volatility 100 Index";

export default function Home() {
  const [latestDigits, setLatestDigits] =
    useState<number[]>([]);

  const [isConnected, setIsConnected] =
    useState(false);

  const dataManager = useMemo(
    () => new DerivDataManager(),
    []
  );

  useEffect(() => {
    dataManager.connect(DEFAULT_SYMBOL);

    const unsubscribe = dataManager.onDigit(
      (digit) => {
        setLatestDigits((previous) => {
          const updated = [...previous, digit];

          return updated.slice(-1000);
        });

        setIsConnected(true);
      }
    );

    return () => {
      unsubscribe();
      dataManager.disconnect();
    };
  }, [dataManager]);

  const digitCounts = useMemo(() => {
    const counts = Array(10).fill(0);

    latestDigits.forEach((digit) => {
      if (digit >= 0 && digit <= 9) {
        counts[digit]++;
      }
    });

    return counts;
  }, [latestDigits]);

  /*
   * One Over/Under analysis per market.
   *
   * The actual prediction engine will later decide:
   *
   * OVER 2
   * OR
   * UNDER 7
   *
   * We are intentionally keeping this as WAIT until
   * the real analysis engine is connected.
   */
  const prediction = "OVER / UNDER";

  const confidence = 0;

  const status = "WAIT" as const;

  const signals = [
    {
      market: DEFAULT_MARKET_NAME,
      prediction,
      confidence,
      status,
    },
  ];

  return (
    <main className="dashboard">
      {/* HEADER */}
      <header className="dashboard-header">
        <div>
          <h1>Deriv Analysis</h1>

          <p>
            Live market analysis and prediction
            dashboard
          </p>
        </div>

        <div
          className={`connection-status ${
            isConnected
              ? "connected"
              : "connecting"
          }`}
        >
          <span className="connection-dot" />

          {isConnected
            ? "Live"
            : "Connecting..."}
        </div>
      </header>

      {/* MARKET OVERVIEW */}
      <section className="market-overview">
        <div className="section-header">
          <div>
            <h2>Market Overview</h2>

            <p>
              Current analysis from the latest
              market ticks
            </p>
          </div>
        </div>

        <div className="market-grid">
          <MarketCard
            market={DEFAULT_MARKET_NAME}
            symbol="Volatility 100 Index"
            prediction={prediction}
            confidence={confidence}
            status={status}
          />
        </div>
      </section>

      {/* TOP SIGNALS */}
      <TopSignals signals={signals} />

      {/* DIGIT STATISTICS */}
      <DigitStats digits={digitCounts} />

      {/* RECENT TICKS */}
      <RecentTicks digits={latestDigits} />

      {/* SIGNAL HISTORY */}
      <SignalHistory signals={[]} />

      {/* FOOTER */}
      <footer className="dashboard-footer">
        Analysis made by{" "}
        <strong>Mwas Josayah</strong>
      </footer>
    </main>
  );
}
