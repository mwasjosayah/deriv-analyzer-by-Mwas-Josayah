"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type LogLevel = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

interface LogEntry {
  id: number;
  time: string;
  level: LogLevel;
  message: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (
    level: LogLevel,
    message: string
  ) => {
    const now = new Date();

    const time = now.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    );

    setLogs((previous) => [
      ...previous,
      {
        id: Date.now() + Math.random(),
        time,
        level,
        message,
      },
    ]);
  };

  useEffect(() => {
    addLog(
      "INFO",
      "System logs initialized"
    );

    addLog(
      "INFO",
      "Waiting for Deriv connection status..."
    );

    return () => {
      // Cleanup
    };
  }, []);

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <main className="logs-page">

      <header className="logs-header">

        <div>
          <div className="logs-brand">
            DERIV ANALYSIS
          </div>

          <h1>
            System Logs
          </h1>

          <p>
            Connection and market-data diagnostics
          </p>
        </div>

        <Link
          href="/"
          className="back-dashboard-button"
        >
          ← Back to Dashboard
        </Link>

      </header>


      <section className="logs-status-grid">

        <div className="log-status-card">

          <span className="status-label">
            WebSocket
          </span>

          <strong className="status-value waiting">
            Waiting
          </strong>

        </div>


        <div className="log-status-card">

          <span className="status-label">
            Deriv API
          </span>

          <strong className="status-value waiting">
            Waiting
          </strong>

        </div>


        <div className="log-status-card">

          <span className="status-label">
            Historical Ticks
          </span>

          <strong className="status-value">
            0
          </strong>

        </div>


        <div className="log-status-card">

          <span className="status-label">
            Live Ticks
          </span>

          <strong className="status-value">
            0
          </strong>

        </div>

      </section>


      <section className="logs-panel">

        <div className="logs-panel-header">

          <div>
            <h2>
              Activity Log
            </h2>

            <p>
              Real-time system activity
            </p>
          </div>

          <button
            type="button"
            onClick={clearLogs}
            className="clear-logs-button"
          >
            Clear Logs
          </button>

        </div>


        <div className="logs-container">

          {logs.length === 0 ? (

            <div className="logs-empty">
              No log entries.
            </div>

          ) : (

            logs.map((log) => (

              <div
                className="log-entry"
                key={log.id}
              >

                <span className="log-time">
                  {log.time}
                </span>

                <span
                  className={`log-level ${log.level.toLowerCase()}`}
                >
                  {log.level}
                </span>

                <span className="log-message">
                  {log.message}
                </span>

              </div>

            ))

          )}

        </div>

      </section>


      <footer className="logs-footer">

        Deriv Analysis System Logs

      </footer>

    </main>
  );
}
