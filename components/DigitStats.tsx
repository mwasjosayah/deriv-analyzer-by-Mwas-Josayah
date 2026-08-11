"use client";

interface DigitStatsProps {
  digits: number[];
}

export default function DigitStats({ digits }: DigitStatsProps) {
  const total = digits.reduce((sum, value) => sum + value, 0);

  return (
    <section className="digit-stats">
      <div className="section-header">
        <div>
          <h2>Digit Statistics</h2>
          <p>Recent digit distribution</p>
        </div>
      </div>

      <div className="digit-grid">
        {digits.map((value, digit) => {
          const percentage =
            total > 0 ? Math.round((value / total) * 100) : 0;

          return (
            <div className="digit-item" key={digit}>
              <div className="digit-number">{digit}</div>

              <div className="digit-info">
                <div className="digit-count">
                  <strong>{value}</strong>
                  <span>{percentage}%</span>
                </div>

                <div className="digit-bar">
                  <div
                    className="digit-bar-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
          }
