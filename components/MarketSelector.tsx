"use client";

export type MarketCategory =
  | "VOLATILITY"
  | "VOLATILITY_1S"
  | "JUMP";

export type MarketType =
  | "OVER_UNDER"
  | "EVEN_ODD"
  | "MATCHES_DIFFERS";

interface MarketSelectorProps {
  category: MarketCategory;
  symbol: string;
  marketType: MarketType;
  selectedDigit: number;

  onCategoryChange: (
    category: MarketCategory
  ) => void;

  onSymbolChange: (
    symbol: string
  ) => void;

  onMarketTypeChange: (
    marketType: MarketType
  ) => void;

  onSelectedDigitChange: (
    digit: number
  ) => void;
}

const marketCategories = {
  VOLATILITY: [
    {
      name: "Volatility 10",
      symbol: "R_10",
    },
    {
      name: "Volatility 25",
      symbol: "R_25",
    },
    {
      name: "Volatility 50",
      symbol: "R_50",
    },
    {
      name: "Volatility 75",
      symbol: "R_75",
    },
    {
      name: "Volatility 100",
      symbol: "R_100",
    },
  ],

  VOLATILITY_1S: [
    {
      name: "Volatility 10 (1s)",
      symbol: "1HZ10V",
    },
    {
      name: "Volatility 25 (1s)",
      symbol: "1HZ25V",
    },
    {
      name: "Volatility 50 (1s)",
      symbol: "1HZ50V",
    },
    {
      name: "Volatility 75 (1s)",
      symbol: "1HZ75V",
    },
    {
      name: "Volatility 100 (1s)",
      symbol: "1HZ100V",
    },
  ],

  JUMP: [
    {
      name: "Jump 10",
      symbol: "JD10",
    },
    {
      name: "Jump 25",
      symbol: "JD25",
    },
    {
      name: "Jump 50",
      symbol: "JD50",
    },
    {
      name: "Jump 75",
      symbol: "JD75",
    },
    {
      name: "Jump 100",
      symbol: "JD100",
    },
  ],
};

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
  const symbols =
    marketCategories[category];

  /*
   * When the category changes, make sure
   * the selected market belongs to the
   * newly selected category.
   */
  const handleCategoryChange = (
    nextCategory: MarketCategory
  ) => {
    onCategoryChange(
      nextCategory
    );

    const nextMarkets =
      marketCategories[
        nextCategory
      ];

    if (
      nextMarkets.length > 0 &&
      !nextMarkets.some(
        (market) =>
          market.symbol === symbol
      )
    ) {
      onSymbolChange(
        nextMarkets[0].symbol
      );
    }
  };

  return (
    <section className="market-selector">

      {/* MARKET CATEGORY */}

      <div className="selector-group">
        <label htmlFor="market-category">
          Market Category
        </label>

        <select
          id="market-category"
          value={category}
          onChange={(event) =>
            handleCategoryChange(
              event.target
                .value as MarketCategory
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


      {/* MARKET */}

      <div className="selector-group">
        <label htmlFor="market-symbol">
          Select Market
        </label>

        <select
          id="market-symbol"
          value={symbol}
          onChange={(event) =>
            onSymbolChange(
              event.target.value
            )
          }
        >
          {symbols.map(
            (market) => (
              <option
                key={market.symbol}
                value={market.symbol}
              >
                {market.name}
              </option>
            )
          )}
        </select>
      </div>


      {/* ANALYSIS TYPE */}

      <div className="selector-group">
        <label htmlFor="market-type">
          Analysis Type
        </label>

        <select
          id="market-type"
          value={marketType}
          onChange={(event) =>
            onMarketTypeChange(
              event.target
                .value as MarketType
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


      {/* TARGET DIGIT */}

      {marketType ===
        "MATCHES_DIFFERS" && (
        <div className="selector-group">
          <label htmlFor="selected-digit">
            Target Digit
          </label>

          <select
            id="selected-digit"
            value={selectedDigit}
            onChange={(event) =>
              onSelectedDigitChange(
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
  );
}
