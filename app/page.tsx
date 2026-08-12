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

const DEFAULT_MARKET = {
  category: "VOLATILITY" as MarketCategory,
  symbol: "R_100",
  name: "Volatility 100 Index",
};

const TICK_WINDOWS = [
  100,
  250,
  500,
  1000,
  2000,
  5000,
];

export default function Home() {
  /*
   * ================================
   * MARKET SETTINGS
   * ================================
   */

  const [
    marketCategory,
    setMarketCategory,
  ] = useState<MarketCategory>(
    DEFAULT_MARKET.category
  );

  const [
    selectedSymbol,
    setSelectedSymbol,
  ] = useState(
    DEFAULT_MARKET.symbol
  );

  /*
   * ================================
   * ANALYSIS SETTINGS
   * ================================
   */

  const [
    marketType,
    setMarketType,
  ] = useState<MarketType>(
    "OVER_UNDER"
  );

  const [
    selectedDigit,
    setSelectedDigit,
  ] = useState(7);

  const [
    tickWindow,
    setTickWindow,
  ] = useState(1000);

  /*
   * ================================
   * LIVE DATA
   * ================================
   */

  const [
    latestDigits,
    setLatestDigits,
  ] = useState<number[]>([]);

  const [
    isConnected,
    setIsConnected,
  ] = useState(false);

  const [
    connectionError,
    setConnectionError,
  ] = useState(false);

  /*
   * ================================
   * DATA MANAGER
   * ================================
   *
   * A new engine is created whenever
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
   * ================================
   * MARKET CONNECTION
   * ================================
   */

  useEffect(() => {
    setIsConnected(false);
    setConnectionError(false);
    setLatestDigits([]);

    /*
     * STATUS LISTENER
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
            setConnectionError(false);
          }

          if (
            status === "error"
          ) {
            setIsConnected(false);
            setConnectionError(true);
          }

          if (
            status ===
            "disconnected"
          ) {
            setIsConnected(false);
          }
        }
      );

    /*
     * DIGIT LISTENER
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

    /*
     * CONNECT
     */

    console.log(
      "[Dashboard] Connecting to market:",
      selectedSymbol
    );

    dataManager.connect(
      selectedSymbol
    );

    /*
     * CLEANUP
     */

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
   * ================================
   * DIGIT STATISTICS
   * ================================
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
   * ================================
   * MARKET NAME
   * ================================
   */

  const marketName =
    useMemo(() => {
      const marketNames: Record<
        string,
        string
      > = {
        R_10:
          "Volatility 10 Index",

        R_25:
          "Volatility 25 Index",

        R_50:
          "Volatility 50 Index",

        R_75:
          "Volatility 75 Index",

        R_100:
          "Volatility 100 Index",

        "1HZ10V":
          "Volatility 10 (1s) Index",

        "1HZ25V":
          "Volatility 25 (1s) Index",

        "1HZ50V":
          "Volatility 50 (1s) Index",

        "1HZ75V":
          "Volatility 75 (1s) Index",

        "1HZ100V":
          "Volatility 100 (1s) Index",

        JD10:
          "Jump 10 Index",

        JD25:
          "Jump 25 Index",

        JD50:
          "Jump 50 Index",

        JD75:
          "Jump 75 Index",

        JD100:
          "Jump 100 Index",
      };

      return (
        marketNames[selectedSymbol] ??
        selectedSymbol
      );
    }, [selectedSymbol]);

  /*
   * ================================
   * ANALYSIS NAME
   * ================================
   */

  const analysisName =
    useMemo(() => {
      switch (marketType) {
        case "OVER_UNDER":
          return "OVER / UNDER";

        case "EVEN_ODD":
          return "EVEN / ODD";

        case "MATCHES_DIFFERS":
          return "MATCHES / DIFFERS";

        default:
          return "OVER / UNDER";
      }
    }, [marketType]);

  /*
   * ================================
   * TEMPORARY PREDICTION
   * ================================
   *
   * This will later be replaced by
   * the real analysis engine.
   */

  const prediction =
    useMemo(() => {
      switch (marketType) {
        case "OVER_UNDER":
          return "WAITING FOR ANALYSIS";

        case "EVEN_ODD":
          return "WAITING FOR ANALYSIS";

        case "MATCHES_DIFFERS":
          return `DIGIT ${selectedDigit}`;

        default:
          return "WAITING FOR ANALYSIS";
      }
    }, [
      marketType,
      selectedDigit,
    ]);

  /*
   * ================================
   * TEMPORARY SIGNAL
   * ================================
   */

  const confidence = 0;

  const status =
    "WAIT" as const;

  const signals = [
    {
      market: marketName,
      prediction,
      confidence,
      status,
    },
  ];

  /*
   * ================================
   * RENDER
   * ================================
   */

  return (
    <main className="dashboard">

      {/* ============================
          HEADER
          ============================ */}

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
              : connectionError
              ? "error"
              : "connecting"
          }`}
        >
          <span className="connection-dot" />

          {isConnected
            ? "Connected"
            : connectionError
            ? "Connection Error"
            : "Connecting..."}
        </div>

      </header>


      {/* ============================
          MARKET SELECTOR
          ============================ */}

      <section className="analysis-controls">

        <div className="section-header">

          <div>
            <h2>
              Analysis Settings
            </h2>

            <p>
              Select the market,
              analysis type and
              tick analysis window.
            </p>
          </div>

        </div>

        <MarketSelector
          category={
            marketCategory
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
            setMarketCategory
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


      {/* ============================
          MARKET OVERVIEW
          ============================ */}

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
              marketName
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


      {/* ============================
          TOP SIGNALS
          ============================ */}

      <TopSignals
        signals={signals}
      />


      {/* ============================
          DIGIT STATISTICS
          ============================ */}

      <DigitStats
        digits={digitCounts}
      />


      {/* ============================
          RECENT TICKS
          ============================ */}

      <RecentTicks
        digits={latestDigits}
      />


      {/* ============================
          SIGNAL HISTORY
          ============================ */}

      <SignalHistory
        signals={[]}
      />


      {/* ============================
          FOOTER
          ============================ */}

      <footer className="dashboard-footer">

        Analysis made by{" "}

        <strong>
          Mwas Josayah
        </strong>

      </footer>

    </main>
  );
}
