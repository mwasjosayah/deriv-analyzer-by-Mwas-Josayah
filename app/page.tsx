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

  const signals = [
    {
      market: "Over 2",
      prediction: "OVER 2",
      confidence: 0,
      status: "WAIT" as const,
    },
    {
      market: "Under 7",
      prediction: "UNDER 7",
      confidence: 0,
      status: "WAIT" as const,
    },
    {
      market: "Even",
      prediction: "EVEN",
      confidence: 0,
      status: "WAIT" as const,
    },
    {
      market: "Odd",
      prediction: "ODD",
      confidence: 0,
      status: "WAIT" as const,
    },
  ];

  return (
    <main className="dashboard">
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
            isConnected ? "connected" : "connecting"
          }`}
        >
          <span className="connection-dot" />

          {isConnected
            ? "Live"
            : "Connecting..."}
        </div>
      </header>

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
        </div>
      </section>

      <TopSignals signals={signals} />

      <DigitStats digits={digitCounts} />

      <RecentTicks digits={latestDigits} />

      <SignalHistory signals={[]} />

      <footer className="dashboard-footer">
        Analysis made by{" "}
        <strong>Mwas Josayah</strong>
      </footer>
    </main>
  );
}
