"use client";

interface MarketCardProps {
  market: string;
  symbol: string;
  prediction: string;
  confidence: number;
  status: "BUY" | "SELL" | "WAIT";
}

export default function MarketCard({
  market,
  symbol,
  prediction,
  confidence,
  status,
}: MarketCardProps) {
  return (
    <div className="market-card">
      <div className="market-card-header">
        <div>
          <h3>{market}</h3>
          <span>{symbol}</span>
        </div>

        <div className={`signal-status ${status.toLowerCase()}`}>
          {status}
        </div>
      </div>

      <div className="prediction">
        <span>Prediction</span>
        <strong>{prediction}</strong>
      </div>

      <div className="confidence">
        <div className="confidence-header">
          <span>Confidence</span>
          <strong>{confidence}%</strong>
        </div>

        <div className="confidence-bar">
          <div
            className="confidence-fill"
            style={{ width: `${confidence}%` }}
          />
        </div>
      </div>
    </div>
  );
}
