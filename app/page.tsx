"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import MarketCard from "../components/MarketCard";
import MarketSelector, {
  MarketCategory,
  MarketType,
} from "../components/MarketSelector";
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
  const [category, setCategory] =
    useState<MarketCategory>(
      DEFAULT_CATEGORY
    );

  const [selectedSymbol, setSelectedSymbol] =
    useState(DEFAULT_SYMBOL);

  const [marketType, setMarketType] =
    useState<MarketType>(
      DEFAULT_MARKET_TYPE
    );

  const [selectedDigit, setSelectedDigit] =
    useState(DEFAULT_SELECTED_DIGIT);

  const [tickWindow, setTickWindow] =
    useState(1000);

  const [latestDigits, setLatestDigits] =
    useState<number[]>([]);

  const [isConnected, setIsConnected] =
    useState(false);

  const [connectionStatus, setConnectionStatus] =
    useState<
      "connecting" |
      "connected" |
      "disconnected" |
      "error"
    >("disconnected");

  /*
   * Create a new analysis engine whenever
   * the selected tick window changes.
   */
  const dataManager = useMemo(() => {
    const engine =
      new DerivAnalysisEngine(
        tickWindow
      );

    return new DerivDataManager(
      engine,
      tickWindow
    );
  }, [tickWindow]);

  /*
   * Connect to the currently selected
   * Deriv market.
   */
  useEffect(() => {
    setLatestDigits([]);
    setIsConnected(false);
    setConnectionStatus(
      "connecting"
    );

    /*
     * Listen for WebSocket status.
     */
    const unsubscribeStatus =
      dataManager.onStatus(
        (status) => {
          console.log(
            "[Dashboard] Deriv status:",
            status
          );

          setConnectionStatus(
            status
          );

          setIsConnected(
            status === "connected"
          );
        }
      );

    /*
     * Listen for incoming digits.
     */
    const unsubscribeDigit =
      dataManager.onDigit(
        (digit) => {
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
      "[Dashboard] Connecting:",
      {
        category,
        symbol: selectedSymbol,
        marketType,
        selectedDigit,
        tickWindow,
      }
    );

    /*
     * Start the Deriv connection.
     */
    dataManager.connect(
      selectedSymbol
    );

    /*
     * Cleanup when market/window changes
     * or component unmounts.
     */
    return () => {
      unsubscribeStatus();
      unsubscribeDigit();

      dataManager.disconnect();
    };
  }, [
    dataManager,
    selectedSymbol,
    category,
    marketType,
    selectedDigit,
    tickWindow,
  ]);

  /*
   * Change market category.
   *
   * When the category changes, choose the
   * first market belonging to that category.
   */
  const handleCategoryChange = (
    newCategory: MarketCategory
  ) => {
    setCategory(
      newCategory
    );

    if (
      newCategory ===
      "VOLATILITY"
    ) {
      setSelectedSymbol(
        "R_10"
      );
      return;
    }

    if (
      newCategory ===
      "VOLATILITY_1S"
    ) {
      setSelectedSymbol(
        "1HZ10V"
      );
      return;
    }

    if (
      newCategory ===
      "JUMP"
    ) {
      setSelectedSymbol(
        "JD10"
      );
    }
  };

  /*
   * Calculate digit distribution.
   */
  const digitCounts = useMemo(() => {
    const counts =
      Array(10).fill(
        0
      ) as number[];

    latestDigits.forEach(
      (digit) => {
        if (
          Number.isInteger(
            digit
          ) &&
          digit >= 0 &&
          digit <= 9
        ) {
          counts[digit]++;
        }
      }
    );

    return counts;
  }, [
    latestDigits,
  ]);

  /*
   * Display name for the selected
   * analysis type.
   */
  const analysisName =
    useMemo(() => {
      switch (marketType) {
        case "OVER_2":
          return "OVER 2";

        case "UNDER_7":
          return "UNDER 7";

        case "EVEN":
          return "EVEN / ODD";

        case "ODD":
          return "EVEN / ODD";

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
   * Prediction logic will be implemented
   * in the analysis layer later.
   *
   * For now we deliberately do NOT generate
   * fake predictions.
   */
  const prediction =
    "WAIT";

  const confidence = 0;

  const status =
    "WAIT" as const;

  /*
   * Temporary signal data for the UI.
   */
  const signals = [
    {
      market:
        selectedSymbol,
      prediction,
      confidence,
      status,
    },
  ];

  /*
   * Human-readable connection text.
   */
  const connectionText =
    useMemo(() => {
      switch (
        connectionStatus
      ) {
        case "connected":
          return "Connected";

        case "connecting":
          return "Connecting...";

        case "error":
          return "Connection Error";

        case "disconnected":
        default:
          return "Disconnected";
      }
    }, [
      connectionStatus,
    ]);

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
          className={`connection-status ${connectionStatus}`}
        >
          <span className="connection-dot" />

          {connectionText}
        </div>

      </header>


      {/* MARKET SELECTOR */}

      <section className="analysis-controls">

        <div className="section-header">

          <div>
            <h2>
              Analysis Settings
            </h2>

            <p>
              Select the market and
              analysis type
            </p>
          </div>

        </div>

        <MarketSelector
          category={
            category
          }
          symbol={
            selectedSymbol
          }
          marketType={
            marketType
          }
          selectedDigit={
            selectedDigit
          }
          onCategoryChange={
            handleCategoryChange
          }
          onSymbolChange={
            setSelectedSymbol
          }
          onMarketTypeChange={
            setMarketType
          }
          onSelectedDigitChange={
            setSelectedDigit
          }
        />

        <div className="control-group">

          <label htmlFor="tick-window">
            Digit Tick Analysis Window
          </label>

          <select
            id="tick-window"
            value={
              tickWindow
            }
            onChange={(event) =>
              setTickWindow(
                Number(
                  event.target.value
                )
              )
            }
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


      {/* CONNECTION INFORMATION */}

      <section className="market-overview">

        <div className="section-header">

          <div>
            <h2>
              Market Overview
            </h2>

            <p>
              Current data from the
              selected Deriv market
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
        signals={
          signals
        }
      />


      {/* DIGIT STATISTICS */}

      <DigitStats
        digits={
          digitCounts
        }
      />


      {/* RECENT TICKS */}

      <RecentTicks
        digits={
          latestDigits
        }
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
