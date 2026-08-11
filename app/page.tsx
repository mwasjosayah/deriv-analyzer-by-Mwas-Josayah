"use client";

import { useState } from "react";
import MarketSelector, {
  MarketCategory,
  MarketType,
} from "../components/MarketSelector";

export default function Home() {
  const [category, setCategory] =
    useState<MarketCategory>("VOLATILITY");

  const [symbol, setSymbol] =
    useState("R_75");

  const [marketType, setMarketType] =
    useState<MarketType>("OVER_2");

  const [selectedDigit, setSelectedDigit] =
    useState(0);

  const handleCategoryChange = (
    newCategory: MarketCategory
  ) => {
    setCategory(newCategory);

    const defaultSymbols = {
      VOLATILITY: "R_75",
      VOLATILITY_1S: "1HZ75V",
      JUMP: "JD75",
    };

    setSymbol(defaultSymbols[newCategory]);
  };

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Deriv Analysis</h1>
          <p>
            Real-time market analysis and predictions
          </p>
        </div>
      </header>

      <MarketSelector
        category={category}
        symbol={symbol}
        marketType={marketType}
        selectedDigit={selectedDigit}
        onCategoryChange={handleCategoryChange}
        onSymbolChange={setSymbol}
        onMarketTypeChange={setMarketType}
        onSelectedDigitChange={setSelectedDigit}
      />

      <section className="dashboard-placeholder">
        <h2>Analysis Dashboard</h2>

        <p>
          Selected Market:{" "}
          <strong>{symbol}</strong>
        </p>

        <p>
          Analysis Type:{" "}
          <strong>{marketType}</strong>
        </p>
      </section>
    </main>
  );
}
