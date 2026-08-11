"use client";

interface RecentTicksProps {
  ticks: number[];
}

export default function RecentTicks({ ticks }: RecentTicksProps) {
  return (
    <section className="recent-ticks">
      <div className="section-header">
        <div>
          <h2>Recent Ticks</h2>
          <p>Latest market digits</p>
        </div>
      </div>

      <div className="ticks-list">
        {ticks.length === 0 ? (
          <div className="empty-state">
            Waiting for market data...
          </div>
        ) : (
          ticks.map((tick, index) => (
            <div className="tick-item" key={`${tick}-${index}`}>
              <span className="tick-index">
                #{index + 1}
              </span>

              <span className="tick-digit">
                {tick}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
      }
