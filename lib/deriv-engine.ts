export type MarketType =
  | "OVER_2"
  | "UNDER_7"
  | "EVEN"
  | "ODD"
  | "MATCHES"
  | "DIFFERS";

export interface DigitAnalysis {
  digit: number;
  count: number;
  percentage: number;
}

export interface PredictionResult {
  market: MarketType;
  prediction: string;
  confidence: number;
  valid: boolean;
  reason: string;
  losingDigits: number[];
  winningDigits: number[];
  statistics: DigitAnalysis[];
}

export class DerivAnalysisEngine {
  private ticks: number[] = [];

  constructor(private maxTicks = 100) {}

  addTick(digit: number) {
    if (
      !Number.isInteger(digit) ||
      digit < 0 ||
      digit > 9
    ) {
      return;
    }

    this.ticks.push(digit);

    if (this.ticks.length > this.maxTicks) {
      this.ticks.shift();
    }
  }

  addTicks(digits: number[]) {
    digits.forEach((digit) => this.addTick(digit));
  }

  getTicks(): number[] {
    return [...this.ticks];
  }

  getStatistics(): DigitAnalysis[] {
    const counts = Array(10).fill(0);

    for (const digit of this.ticks) {
      counts[digit]++;
    }

    const total = this.ticks.length;

    return counts.map((count, digit) => ({
      digit,
      count,
      percentage:
        total > 0 ? (count / total) * 100 : 0,
    }));
  }

  analyze(
    market: MarketType,
    selectedDigit?: number
  ): PredictionResult {
    const statistics = this.getStatistics();

    const marketRules =
      this.getMarketRules(market, selectedDigit);

    if (this.ticks.length === 0) {
      return {
        market,
        prediction: marketRules.defaultPrediction,
        confidence: 0,
        valid: false,
        reason: "Waiting for market data",
        losingDigits: marketRules.losingDigits,
        winningDigits: marketRules.winningDigits,
        statistics,
      };
    }

    const losingStats = marketRules.losingDigits.map(
      (digit) => statistics[digit]
    );

    const averageLosingPercentage =
      losingStats.length > 0
        ? losingStats.reduce(
            (sum, stat) => sum + stat.percentage,
            0
          ) / losingStats.length
        : 0;

    const maxLosingPercentage =
      losingStats.length > 0
        ? Math.max(
            ...losingStats.map(
              (stat) => stat.percentage
            )
          )
        : 0;

    const sampleSizeFactor = Math.min(
      this.ticks.length / 100,
      1
    );

    let confidence =
      50 +
      (50 - averageLosingPercentage * 2) *
        sampleSizeFactor;

    if (market === "MATCHES" && selectedDigit !== undefined) {
      const matchPercentage =
        statistics[selectedDigit].percentage;

      confidence = matchPercentage * 3;
    }

    if (market === "DIFFERS" && selectedDigit !== undefined) {
      const matchPercentage =
        statistics[selectedDigit].percentage;

      confidence = 100 - matchPercentage * 3;
    }

    confidence = Math.max(
      0,
      Math.min(99, Math.round(confidence))
    );

    const invalid =
      maxLosingPercentage > 10.5;

    if (invalid) {
      confidence = Math.max(
        0,
        confidence - 20
      );
    }

    return {
      market,
      prediction: marketRules.defaultPrediction,
      confidence,
      valid: !invalid,
      reason: invalid
        ? "Market conditions are weak"
        : "Market conditions acceptable",
      losingDigits: marketRules.losingDigits,
      winningDigits: marketRules.winningDigits,
      statistics,
    };
  }

  private getMarketRules(
    market: MarketType,
    selectedDigit?: number
  ) {
    switch (market) {
      case "OVER_2":
        return {
          defaultPrediction: "OVER 2",
          losingDigits: [0, 1, 2],
          winningDigits: [3, 4, 5, 6, 7, 8, 9],
        };

      case "UNDER_7":
        return {
          defaultPrediction: "UNDER 7",
          losingDigits: [7, 8, 9],
          winningDigits: [0, 1, 2, 3, 4, 5, 6],
        };

      case "EVEN":
        return {
          defaultPrediction: "EVEN",
          losingDigits: [1, 3, 5, 7, 9],
          winningDigits: [0, 2, 4, 6, 8],
        };

      case "ODD":
        return {
          defaultPrediction: "ODD",
          losingDigits: [0, 2, 4, 6, 8],
          winningDigits: [1, 3, 5, 7, 9],
        };

      case "MATCHES": {
        const digit =
          selectedDigit !== undefined
            ? selectedDigit
            : 0;

        return {
          defaultPrediction: `MATCHES ${digit}`,
          losingDigits: Array.from(
            { length: 10 },
            (_, i) => i
          ).filter((i) => i !== digit),
          winningDigits: [digit],
        };
      }

      case "DIFFERS": {
        const digit =
          selectedDigit !== undefined
            ? selectedDigit
            : 0;

        return {
          defaultPrediction: `DIFFERS ${digit}`,
          losingDigits: [digit],
          winningDigits: Array.from(
            { length: 10 },
            (_, i) => i
          ).filter((i) => i !== digit),
        };
      }
    }
  }
}
