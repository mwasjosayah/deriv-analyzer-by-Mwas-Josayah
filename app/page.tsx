"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import MarketSelector, {
  MarketCategory,
  MarketType,
} from "../components/MarketSelector";

import MarketCard from "../components/MarketCard";
import TopSignals from "../components/TopSignals";
import DigitStats from "../components/DigitStats";
import RecentTicks from "../components/RecentTicks";
import SignalHistory from "../components/SignalHistory";

import { DerivDataManager } from "../lib/deriv-data";
import { DerivAnalysisEngine } from "../lib/deriv-engine";

const DEFAULT_CATEGORY: MarketCategory =
  "VOLATILITY";

const DEFAULT_SYMBOL = "R_100";

const DEFAULT_MARKET_TYPE: MarketType =
  "OVER_2";

const DEFAULT_SELECTED_DIGIT = 7;

const TICK_WINDOWS = [
  100,
  250,
  500,
  1000,
  2000,
  5000,
];

export default function Home() {
  const [
    category,
    setCategory,
  ] = useState<MarketCategory>(
    DEFAULT_CATEGORY
  );

  const [
    selectedSymbol,
    setSelectedSymbol,
  ] = useState(
    DEFAULT_SYMBOL
  );

  const [
    marketType,
    setMarketType,
  ] = useState<MarketType>(
    DEFAULT_MARKET_TYPE
  );

  const [
    selectedDigit,
    setSelectedDigit,
  ] = useState(
    DEFAULT_SELECTED_DIGIT
  );

  const [
    tickWindow,
    setTickWindow,
  ] = useState(1000);

  const [
    latestDigits,
    setLatestDigits,
  ] = useState<number[]>([]);

  const [
    isConnected,
    setIsConnected,
  ] = useState(false);

  /*
   * Create a fresh analysis engine
   * whenever the tick window changes.
   */
  const dataManager = useMemo(() => {
    const engine =
      new DerivAnalysisEngine(
        tickWindow
      );

    return new DerivDataManager(
      engine
    );
  }, [tickWindow]);

  /*
   * Connect to the selected
   * Deriv market.
   */
  useEffect(() => {
    setIsConnected(false);
    setLatestDigits([]);

    /*
     * Status listener.
     */
    const unsubscribeStatus =
      dataManager.onStatus(
        (status) => {
          console.log(
            "[Dashboard] Deriv status:",
            status
          );

          if (
            status === "connected"
          ) {
            setIsConnected(true);
          }

          if (
            status === "disconnected" ||
            status === "error"
          ) {
            setIsConnected(false);
          }
        }
      );

    /*
     * Digit listener.
     */
    const unsubscribeDigit =
      dataManager.onDigit(
        (digit: number) => {
          console.log(
            "[Dashboard] Digit:",
            digit
          );

          setLatestDigits(
            (previous) => {
              const updated = [
                ...previous,
                digit,
              ];

              return updated.slice(
                -tickWindow
              );
            }
          );
        }
      );

    console.log(
      "[Dashboard] Connecting to:",
      selectedSymbol
    );

    dataManager.connect(
      selectedSymbol
    );

    return () => {
      unsubscribeStatus();
      unsubscribeDigit();

      dataManager.disconnect();
    };
  }, [
    dataManager,
    selectedSymbol,
    tickWindow,
  ]);

  /*
   * Digit distribution.
   */
  const digitCounts = useMemo(() => {
    const counts =
      Array(10).fill(
        0
      ) as number[];

    latestDigits.forEach(
      (digit) => {
        if (
          Number.isInteger(digit) &&
          digit >= 0 &&
          digit <= 9
        ) {
          counts[digit]++;
        }
      }
    );

    return counts;
  }, [latestDigits]);

  /*
   * Display name for the selected
   * analysis type.
   */
  const analysisName = useMemo(() => {
    switch (marketType) {
      case "OVER_2":
        return "OVER 2";

      case "UNDER_7":
        return "UNDER 7";

      case "EVEN":
        return "EVEN";

      case "ODD":
        return "ODD";

      case "MATCHES":
        return `MATCHES ${selectedDigit}`;

      case "DIFFERS":
        return `DIFFERS ${selectedDigit}`;

      default:
        return "OVER 2";
    }
  }, [
    marketType,
    selectedDigit,
  ]);

  /*
   * Prediction will be replaced
   * by the real analysis engine
   * later.
   */
  const prediction = useMemo(() => {
    switch (marketType) {
      case "OVER_2":
        return "OVER 2";

      case "UNDER_7":
        return "UNDER 7";

      case "EVEN":
        return "EVEN";

      case "ODD":
        return "ODD";

      case "MATCHES":
        return `MATCHES ${selectedDigit}`;

      case "DIFFERS":
        return `DIFFERS ${selectedDigit}`;

      default:
        return "WAIT";
    }
  }, [
    marketType,
    selectedDigit,
  ]);

  /*
   * Real confidence calculation
   * will be added later.
   */
  const confidence = 0;

  const status =
    "WAIT" as const;

  const signals = [
    {
      market: selectedSymbol,
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
          <h1>
            Deriv Analysis
          </h1>

          <p>
            Live market analysis
            and prediction dashboard
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
            ? "Connected"
            : "Connecting..."}
        </div>

      </header>


      {/* MARKET SELECTOR */}

      <MarketSelector
        category={category}
        symbol={selectedSymbol}
        marketType={marketType}
        selectedDigit={selectedDigit}

        onCategoryChange={(
          newCategory
        ) => {
          setCategory(
            newCategory
          );

          /*
           * Set the first market
           * belonging to the selected
           * category.
           */
          if (
            newCategory ===
            "VOLATILITY"
          ) {
            setSelectedSymbol(
              "R_10"
            );
          }

          if (
            newCategory ===
            "VOLATILITY_1S"
          ) {
            setSelectedSymbol(
              "1HZ10V"
            );
          }

          if (
            newCategory ===
            "JUMP"
          ) {
            setSelectedSymbol(
              "JD10"
            );
          }
        }}

        onSymbolChange={(
          symbol
        ) => {
          setSelectedSymbol(
            symbol
          );
        }}

        onMarketTypeChange={(
          type
        ) => {
          setMarketType(
            type
          );
        }}

        onSelectedDigitChange={(
          digit
        ) => {
          setSelectedDigit(
            digit
          );
        }}
      />


      {/* ANALYSIS SETTINGS */}

      <section className="analysis-controls">

        <div className="section-header">

          <div>
            <h2>
              Analysis Settings
            </h2>

            <p>
              Configure the amount of
              tick data used for analysis
            </p>
          </div>

        </div>

        <div className="control-group">

          <label htmlFor="tick-window">
            Digit Tick Analysis Window
          </label>

          <select
            id="tick-window"
            value={tickWindow}
            onChange={(event) => {
              setTickWindow(
                Number(
                  event.target.value
                )
              );
            }}
          >
            {TICK_WINDOWS.map(
              (ticks) => (
                <option
                  key={ticks}
                  value={ticks}
                >
                  {ticks.toLocaleString()}{" "}
                  ticks
                </option>
              )
            )}
          </select>

        </div>

      </section>


      {/* MARKET OVERVIEW */}

      <section className="market-overview">

        <div className="section-header">

          <div>
            <h2>
              Market Overview
            </h2>

            <p>
              Current analysis from
              the selected market
            </p>
          </div>

        </div>

        <div className="market-grid">

          <MarketCard
            market={
              selectedSymbol
            }
            symbol={
              analysisName
            }
            prediction={
              prediction
            }
            confidence={
              confidence
            }
            status={
              status
            }
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
