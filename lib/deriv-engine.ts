export class DerivAnalysisEngine {
  private ticks: number[] = [];
  private readonly maxTicks: number;

  constructor(maxTicks: number = 1000) {
    this.maxTicks =
      Number.isFinite(maxTicks) && maxTicks > 0
        ? Math.floor(maxTicks)
        : 1000;
  }

  addTick(digit: number): void {
    if (
      !Number.isInteger(digit) ||
      digit < 0 ||
      digit > 9
    ) {
      return;
    }

    this.ticks.push(digit);

    if (this.ticks.length > this.maxTicks) {
      this.ticks.splice(
        0,
        this.ticks.length - this.maxTicks
      );
    }
  }

  addTicks(digits: number[]): void {
    if (!Array.isArray(digits)) {
      return;
    }

    for (const digit of digits) {
      this.addTick(digit);
    }
  }

  getTicks(): number[] {
    return [...this.ticks];
  }

  getLatestDigit(): number | null {
    if (this.ticks.length === 0) {
      return null;
    }

    return this.ticks[
      this.ticks.length - 1
    ];
  }

  getTickCount(): number {
    return this.ticks.length;
  }

  getDigitCounts(): number[] {
    const counts = Array(10).fill(
      0
    ) as number[];

    for (const digit of this.ticks) {
      if (
        Number.isInteger(digit) &&
        digit >= 0 &&
        digit <= 9
      ) {
        counts[digit]++;
      }
    }

    return counts;
  }

  getDigitPercentages(): number[] {
    const counts =
      this.getDigitCounts();

    const total =
      this.ticks.length;

    if (total === 0) {
      return Array(10).fill(
        0
      ) as number[];
    }

    return counts.map((count) =>
      Number(
        (
          (count / total) *
          100
        ).toFixed(2)
      )
    );
  }

  getDigitStats() {
    const counts =
      this.getDigitCounts();

    const percentages =
      this.getDigitPercentages();

    return Array.from(
      { length: 10 },
      (_, digit) => ({
        digit,
        count: counts[digit],
        percentage:
          percentages[digit],
      })
    );
  }

  clear(): void {
    this.ticks = [];
  }
}
