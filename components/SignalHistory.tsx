"use client";

interface Signal {
  market: string;
  prediction: string;
  confidence: number;
  status: "BUY" | "SELL" | "WAIT";
}

interface SignalHistoryProps {
  signals: Signal[];
}

export default function SignalHistory({
  signals,
}: SignalHistoryProps) {
  return (
    <section className="signal-history">
      <div className="section-header">
        <div>
          <h2>Signal History</h2>
          <p>Previous market analysis signals</p>
        </div>
      </div>

      <div className="history-list">
        {signals.length === 0 ? (
          <div className="empty-state">
            No signal history available yet.
          </div>
        ) : (
          signals.map((signal, index) => (
            <div
              className="history-row"
              key={`${signal.market}-${index}`}
            >
              <div className="history-market">
                <strong>{signal.market}</strong>
                <span>{signal.prediction}</span>
              </div>

              <div
                className={`signal-status ${signal.status.toLowerCase()}`}
              >
                {signal.status}
              </div>

              <div className="history-confidence">
                {signal.confidence}%
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
