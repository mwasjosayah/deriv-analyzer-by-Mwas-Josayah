"use client";

import { useEffect, useState } from "react";

interface LogEntry {
  time: string;
  type: "INFO" | "SUCCESS" | "ERROR" | "TICK";
  message: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const addLog = (
      type: LogEntry["type"],
      message: string
    ) => {
      const now = new Date();

      const time = now.toLocaleTimeString();

      setLogs((previous) => [
        ...previous,
        {
          time,
          type,
          message,
        },
      ]);
    };

    addLog(
      "INFO",
      "Deriv Analysis diagnostic console opened."
    );

    addLog(
      "INFO",
      "This page is ready to display connection and market-data events."
    );

    /*
     * Listen for messages sent from the main dashboard.
     */
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      const data = event.data;

      if (data.type === "DERIV_STATUS") {
        if (data.status === "connected") {
          setConnected(true);

          addLog(
            "SUCCESS",
            "WebSocket connection established with Deriv."
          );
        }

        if (data.status === "connecting") {
          setConnected(false);

          addLog(
            "INFO",
            "Attempting to connect to Deriv..."
          );
        }

        if (data.status === "disconnected") {
          setConnected(false);

          addLog(
            "ERROR",
            "WebSocket disconnected from Deriv."
          );
        }

        if (data.status === "error") {
          setConnected(false);

          addLog(
            "ERROR",
            data.message ||
              "Deriv WebSocket reported an error."
          );
        }
      }

      if (data.type === "DERIV_TICK") {
        addLog(
          "TICK",
          `Live tick received — Digit: ${data.digit}`
        );
      }

      if (data.type === "DERIV_LOG") {
        addLog(
          data.level || "INFO",
          data.message
        );
      }
    };

    window.addEventListener(
      "message",
      handleMessage
    );

    return () => {
      window.removeEventListener(
        "message",
        handleMessage
      );
    };
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <main className="logs-page">

      <header className="logs-header">

        <div>
          <h1>Connection Logs</h1>

          <p>
            Deriv market-data connection and
            diagnostic information
          </p>
        </div>

        <div
          className={`logs-status ${
            connected
              ? "logs-connected"
              : "logs-disconnected"
          }`}
        >
          <span />

          {connected
            ? "Connected"
            : "Not Connected"}
        </div>

      </header>


      <section className="logs-panel">

        <div className="logs-toolbar">

          <div>
            <strong>
              System Activity
            </strong>

            <span>
              {logs.length} log
              {logs.length === 1
                ? ""
                : "s"}
            </span>
          </div>

          <button
            type="button"
            onClick={clearLogs}
          >
            Clear Logs
          </button>

        </div>


        <div className="logs-container">

          {logs.length === 0 ? (
            <div className="empty-logs">
              No logs available yet.
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                className={`log-entry log-${log.type.toLowerCase()}`}
                key={`${log.time}-${index}`}
              >

                <span className="log-time">
                  {log.time}
                </span>

                <span className="log-type">
                  {log.type}
                </span>

                <span className="log-message">
                  {log.message}
                </span>

              </div>
            ))
          )}

        </div>

      </section>


      <button
        type="button"
        className="back-dashboard"
        onClick={() => {
          window.location.href = "/";
        }}
      >
        ← Back to Dashboard
      </button>

    </main>
  );
}ERS":
        return "MATCHES / DIFFERS";

      default:
        return "OVER / UNDER";
    }
  };

  /*
   * Temporary prediction display.
   *
   * The real prediction engine will be
   * connected after the live data stream
   * is confirmed.
   */
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
            ? "Connected"
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
                Number(
                  event.target.value
                )
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
                  Number(
                    event.target.value
                  )
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
