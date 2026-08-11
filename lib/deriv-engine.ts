export type MarketType = "OVER_2" | "UNDER_7";

export interface DigitAnalysis {
  digit: number;
  count: number;
  percentage: number;
}

export interface PredictionResult {
  market: MarketType;
  prediction1: number;
  prediction2: number;
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
    if (digit < 0 || digit > 9 || !Number.isInteger(digit)) {
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
      percentage: total > 0 ? (count / total) * 100 : 0,
    }));
  }

  analyze(market: MarketType): PredictionResult {
    const statistics = this.getStatistics();

    if (this.ticks.length === 0) {
      return {
        market,
        prediction1: market === "OVER_2" ? 2 : 7,
        prediction2: market === "OVER_2" ? 2 : 7,
        confidence: 0,
        valid: false,
        reason: "Waiting for market data",
        losingDigits: market === "OVER_2" ? [0, 1, 2] : [7, 8, 9],
        winningDigits: market === "OVER_2"
          ? [3, 4, 5, 6, 7, 8, 9]
          : [0, 1, 2, 3, 4, 5, 6],
        statistics,
      };
    }

    const losingDigits =
      market === "OVER_2"
        ? [0, 1, 2]
        : [7, 8, 9];

    const winningDigits =
      market === "OVER_2"
        ? [3, 4, 5, 6, 7, 8, 9]
        : [0, 1, 2, 3, 4, 5, 6];

    const losingStats = losingDigits.map(
      (digit) => statistics[digit]
    );

    const invalid = losingStats.some(
      (stat) => stat.percentage > 10.5
    );

    const nextDigit =
      market === "OVER_2" ? 3 : 6;

    const nextDigitPercentage =
      statistics[nextDigit]?.percentage ?? 0;

    let prediction1: number;
    let prediction2: number;

    if (nextDigitPercentage < 10) {
      prediction1 = market === "OVER_2" ? 2 : 7;
      prediction2 = nextDigit;
    } else {
      prediction1 = market === "OVER_2" ? 2 : 7;
      prediction2 = market === "OVER_2" ? 2 : 7;
    }

    const averageLosingPercentage =
      losingStats.reduce(
        (sum, stat) => sum + stat.percentage,
        0
      ) / losingStats.length;

    let confidence =
      100 - averageLosingPercentage * 2;

    if (nextDigitPercentage < 10) {
      confidence += 5;
    }

    if (invalid) {
      confidence -= 20;
    }

    confidence = Math.max(
      0,
      Math.min(99, Math.round(confidence))
    );

    return {
      market,
      prediction1,
      prediction2,
      confidence,
      valid: !invalid,
      reason: invalid
        ? "Market invalid: one or more losing digits are above 10.5%"
        : "Market conditions acceptable",
      losingDigits,
      winningDigits,
      statistics,
    };
  }
}
