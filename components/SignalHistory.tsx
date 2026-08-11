"use client";

interface SignalHistoryItem {
  time: string;
  market: string;
  prediction: string;
  confidence: number;
  result: "WIN" | "LOSS" | "PENDING";
}

interface SignalHistoryProps {
  history: SignalHistoryItem[];
}

export default function SignalHistory({
  history,
}: SignalHistoryProps) {
  return (
    <section className="signal-history">
      <div className="section-header">
        <div>
          <h2>Signal History</h2>
          <p>Previous predictions and results</p>
        </div>
      </div>

      <div className="history-list">
        {history.length === 0 ? (
          <div className="empty-state">
            No signal history yet.
          </div>
        ) : (
          history.map((item, index) => (
            <div className="history-row" key={`${item.time}-${index}`}>
              <div className="history-time">
                {item.time}
              </div>

              <div className="history-market">
                <strong>{item.market}</strong>
                <span>{item.prediction}</span>
              </div>

              <div className="history-confidence">
                {item.confidence}%
              </div>

              <div
                className={`history-result ${item.result.toLowerCase()}`}
              >
                {item.result}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
