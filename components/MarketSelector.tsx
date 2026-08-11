"use client";

export type MarketCategory =
  | "VOLATILITY"
  | "VOLATILITY_1S"
  | "JUMP";

export type MarketType =
  | "OVER_2"
  | "UNDER_7"
  | "EVEN"
  | "ODD"
  | "MATCHES"
  | "DIFFERS";

interface MarketSelectorProps {
  category: MarketCategory;
  symbol: string;
  marketType: MarketType;
  selectedDigit: number;
  onCategoryChange: (category: MarketCategory) => void;
  onSymbolChange: (symbol: string) => void;
  onMarketTypeChange: (market: MarketType) => void;
  onSelectedDigitChange: (digit: number) => void;
}

const marketCategories = {
  VOLATILITY: [
    { name: "Volatility 10", symbol: "R_10" },
    { name: "Volatility 25", symbol: "R_25" },
    { name: "Volatility 50", symbol: "R_50" },
    { name: "Volatility 75", symbol: "R_75" },
    { name: "Volatility 100", symbol: "R_100" },
  ],

  VOLATILITY_1S: [
    { name: "Volatility 10 (1s)", symbol: "1HZ10V" },
    { name: "Volatility 25 (1s)", symbol: "1HZ25V" },
    { name: "Volatility 50 (1s)", symbol: "1HZ50V" },
    { name: "Volatility 75 (1s)", symbol: "1HZ75V" },
    { name: "Volatility 100 (1s)", symbol: "1HZ100V" },
  ],

  JUMP: [
    { name: "Jump 10", symbol: "JD10" },
    { name: "Jump 25", symbol: "JD25" },
    { name: "Jump 50", symbol: "JD50" },
    { name: "Jump 75", symbol: "JD75" },
    { name: "Jump 100", symbol: "JD100" },
  ],
};

const marketTypes = [
  { value: "OVER_2", label: "Over 2" },
  { value: "UNDER_7", label: "Under 7" },
  { value: "EVEN", label: "Even" },
  { value: "ODD", label: "Odd" },
  { value: "MATCHES", label: "Matches" },
  { value: "DIFFERS", label: "Differs" },
];

export default function MarketSelector({
  category,
  symbol,
  marketType,
  selectedDigit,
  onCategoryChange,
  onSymbolChange,
  onMarketTypeChange,
  onSelectedDigitChange,
}: MarketSelectorProps) {
  const symbols = marketCategories[category];

  return (
    <section className="market-selector">
      <div className="selector-group">
        <label>Market Category</label>

        <select
          value={category}
          onChange={(event) =>
            onCategoryChange(
              event.target.value as MarketCategory
            )
          }
        >
          <option value="VOLATILITY">
            Volatility Indices
          </option>

          <option value="VOLATILITY_1S">
            Volatility 1s Indices
          </option>

          <option value="JUMP">
            Jump Indices
          </option>
        </select>
      </div>

      <div className="selector-group">
        <label>Select Market</label>

        <select
          value={symbol}
          onChange={(event) =>
            onSymbolChange(event.target.value)
          }
        >
          {symbols.map((item) => (
            <option
              key={item.symbol}
              value={item.symbol}
            >
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="selector-group">
        <label>Analysis Type</label>

        <select
          value={marketType}
          onChange={(event) =>
            onMarketTypeChange(
              event.target.value as MarketType
            )
          }
        >
          {marketTypes.map((type) => (
            <option
              key={type.value}
              value={type.value}
            >
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {(marketType === "MATCHES" ||
        marketType === "DIFFERS") && (
        <div className="selector-group">
          <label>Select Digit</label>

          <select
            value={selectedDigit}
            onChange={(event) =>
              onSelectedDigitChange(
                Number(event.target.value)
              )
            }
          >
            {Array.from({ length: 10 }, (_, digit) => (
              <option key={digit} value={digit}>
                Digit {digit}
              </option>
            ))}
          </select>
        </div>
      )}
    </section>
  );
              }
