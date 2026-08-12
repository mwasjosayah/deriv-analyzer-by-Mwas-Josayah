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
import { DerivAnalysisEngine } from "../lib/deriv-engine";

type AnalysisType =
  | "OVER_UNDER"
  | "EVEN_ODD"
  | "MATCHES_DIFFERS";

interface MarketOption {
  name: string;
  symbol: string;
}

const MARKETS: MarketOption[] = [
  {
    name: "Volatility 10 Index",
    symbol: "R_10",
  },
  {
    name: "Volatility 25 Index",
    symbol: "R_25",
  },
  {
    name: "Volatility 50 Index",
    symbol: "R_50",
  },
  {
    name: "Volatility 75 Index",
    symbol: "R_75",
  },
  {
    name: "Volatility 100 Index",
    symbol: "R_100",
  },
  {
    name: "Volatility 10 (1s) Index",
    symbol: "1HZ10V",
  },
  {
    name: "Volatility 25 (1s) Index",
    symbol: "1HZ25V",
  },
  {
    name: "Volatility 50 (1s) Index",
    symbol: "1HZ50V",
  },
  {
    name: "Volatility 75 (1s) Index",
    symbol: "1HZ75V",
  },
  {
    name: "Volatility 100 (1s) Index",
    symbol: "1HZ100V",
  },
  {
    name: "Jump 10 Index",
    symbol: "JD10",
  },
  {
    name: "Jump 25 Index",
    symbol: "JD25",
  },
  {
    name: "Jump 50 Index",
    symbol: "JD50",
  },
  {
    name: "Jump 75 Index",
    symbol: "JD75",
  },
  {
    name: "Jump 100 Index",
    symbol: "JD100",
  },
];

const TICK_WINDOWS = [
  100,
  250,
  500,
  1000,
  2000,
  5000,
];

export default function Home() {
  const [selectedMarket, setSelectedMarket] =
    useState<MarketOption>(MARKETS[4]);

  const [analysisType, setAnalysisType] =
    useState<AnalysisType>("OVER_UNDER");

  const [tickWindow, setTickWindow] =
    useState(1000);

  const [targetDigit, setTargetDigit] =
    useState(7);

  const [latestDigits, setLatestDigits] =
    useState<number[]>([]);

  const [isConnected, setIsConnected] =
    useState(false);

  /*
   * The analysis engine is recreated whenever
   * the selected tick window changes.
   *
   * 1,000 ticks is the default.
   */
  const dataManager = useMemo(() => {
    const engine =
      new DerivAnalysisEngine(tickWindow);

    return new DerivDataManager(engine);
  }, [tickWindow]);

  /*
   * Connect to the selected Deriv market.
   */
  useEffect(() => {
    setIsConnected(false);
    setLatestDigits([]);

    dataManager.connect(
      selectedMarket.symbol
    );

    const unsubscribe =
      dataManager.onDigit((digit) => {
        setLatestDigits((previous) => {
          const updated = [
            ...previous,
            digit,
          ];

          /*
           * Keep enough recent ticks for the
           * selected analysis window.
           */
          return updated.slice(
            -tickWindow
          );
        });

        setIsConnected(true);
      });

    return () => {
      unsubscribe();
      dataManager.disconnect();
    };
  }, [
    dataManager,
    selectedMarket,
    tickWindow,
  ]);

  /*
   * Calculate digit distribution for the
   * currently selected analysis window.
   */
  const digitCounts = useMemo(() => {
    const counts = Array(10).fill(0);

    latestDigits.forEach((digit) => {
      if (
        Number.isInteger(digit) &&
        digit >= 0 &&
        digit <= 9
      ) {
        counts[digit]++;
      }
    });

    return counts;
  }, [latestDigits]);

  /*
   * Display text for the selected analysis.
   *
   * Actual prediction mathematics will be
   * connected after the dashboard structure
   * is confirmed.
   */
  const getAnalysisName = () => {
    switch (analysisType) {
      case "OVER_UNDER":
        return "OVER / UNDER";

      case "EVEN_ODD":
        return "EVEN / ODD";

      case "MATCHES_DIFFERS":
        return "MATCHES / DIFFERS";

      default:
        return "OVER / UNDER";
    }
  };

  const getPredictionPlaceholder = () => {
    switch (analysisType) {
      case "OVER_UNDER":
        return "OVER / UNDER";

      case "EVEN_ODD":
        return "EVEN / ODD";

      case "MATCHES_DIFFERS":
        return `MATCHES / DIFFERS ${targetDigit}`;

      default:
        return "OVER / UNDER";
    }
  };

  const analysisName =
    getAnalysisName();

  const prediction =
    getPredictionPlaceholder();

  const confidence = 0;

  const status = "WAIT" as const;

  const signals = [
    {
      market: selectedMarket.name,
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
            Live market analysis and
            prediction dashboard
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


      {/* ANALYSIS CONTROLS */}

      <section className="analysis-controls">

        <div className="section-header">
          <div>
            <h2>Analysis Settings</h2>

            <p>
              Choose the market, analysis type
              and digit tick window
            </p>
          </div>
        </div>


        {/* MARKET */}

        <div className="control-group">
          <label htmlFor="market">
            Select Market
          </label>

          <select
            id="market"
            value={selectedMarket.symbol}
            onChange={(event) => {
              const market =
                MARKETS.find(
                  (item) =>
                    item.symbol ===
                    event.target.value
                );

              if (market) {
                setSelectedMarket(
                  market
                );
              }
            }}
          >
            {MARKETS.map((market) => (
              <option
                key={market.symbol}
                value={market.symbol}
              >
                {market.name}
              </option>
            ))}
          </select>
        </div>


        {/* ANALYSIS TYPE */}

        <div className="control-group">
          <label htmlFor="analysis-type">
            Analysis Type
          </label>

          <select
            id="analysis-type"
            value={analysisType}
            onChange={(event) =>
              setAnalysisType(
                event.target
                  .value as AnalysisType
              )
            }
          >
            <option value="OVER_UNDER">
              Over / Under
            </option>

            <option value="EVEN_ODD">
              Even / Odd
            </option>

            <option value="MATCHES_DIFFERS">
              Matches / Differs
            </option>
          </select>
        </div>


        {/* TICK WINDOW */}

        <div className="control-group">
          <label htmlFor="tick-window">
            Digit Tick Analysis Window
          </label>

          <select
            id="tick-window"
            value={tickWindow}
            onChange={(event) =>
              setTickWindow(
                Number(event.target.value)
              )
            }
          >
            {TICK_WINDOWS.map((ticks) => (
              <option
                key={ticks}
                value={ticks}
              >
                {ticks.toLocaleString()} ticks
              </option>
            ))}
          </select>
        </div>


        {/* TARGET DIGIT */}

        {analysisType ===
          "MATCHES_DIFFERS" && (
          <div className="control-group">
            <label htmlFor="target-digit">
              Target Digit
            </label>

            <select
              id="target-digit"
              value={targetDigit}
              onChange={(event) =>
                setTargetDigit(
                  Number(event.target.value)
                )
              }
            >
              {Array.from(
                { length: 10 },
                (_, digit) => (
                  <option
                    key={digit}
                    value={digit}
                  >
                    Digit {digit}
                  </option>
                )
              )}
            </select>
          </div>
        )}

      </section>


      {/* MARKET OVERVIEW */}

      <section className="market-overview">

        <div className="section-header">
          <div>
            <h2>
              Market Overview
            </h2>

            <p>
              Current analysis from the
              selected market
            </p>
          </div>
        </div>


        <div className="market-grid">

          <MarketCard
            market={selectedMarket.name}
            symbol={analysisName}
            prediction={prediction}
            confidence={confidence}
            status={status}
          />

        </div>

      </section>


      {/* TOP SIGNALS */}

      <TopSignals
        signals={signals}
      />


      {/* DIGIT STATISTICS */}

      <DigitStats
        digits={digitCounts}
      />


      {/* RECENT TICKS */}

      <RecentTicks
        digits={latestDigits}
      />


      {/* SIGNAL HISTORY */}

      <SignalHistory
        signals={[]}
      />


      {/* FOOTER */}

      <footer className="dashboard-footer">
        Analysis made by{" "}
        <strong>
          Mwas Josayah
        </strong>
      </footer>

    </main>
  );
}
