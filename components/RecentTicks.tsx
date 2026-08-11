"use client";

interface RecentTicksProps {
  digits: number[];
}

export default function RecentTicks({
  digits,
}: RecentTicksProps) {
  return (
    <section className="recent-ticks">
      <div className="section-header">
        <div>
          <h2>Recent Ticks</h2>
          <p>Latest digits received from the live market</p>
        </div>
      </div>

      <div className="ticks-list">
        {digits.length === 0 ? (
          <div className="empty-state">
            Waiting for live market data...
          </div>
        ) : (
          digits.map((digit, index) => (
            <div
              className="tick-digit"
              key={`${index}-${digit}`}
            >
              {digit}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
