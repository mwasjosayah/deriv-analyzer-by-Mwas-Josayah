import { DerivAnalysisEngine } from "./deriv-engine";

export interface DerivTick {
  quote: number;
  epoch: number;
  digit: number;
  symbol: string;
}

type DigitListener = (digit: number) => void;

type TickListener = (tick: DerivTick) => void;

type StatusListener = (
  status: "connecting" | "connected" | "disconnected" | "error"
) => void;

export class DerivDataManager {
  private socket: WebSocket | null = null;

  private engine: DerivAnalysisEngine;

  private digitListeners: DigitListener[] = [];

  private tickListeners: TickListener[] = [];

  private statusListeners: StatusListener[] = [];

  private currentTick: DerivTick | null = null;

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private reconnectAttempts = 0;

  private currentSymbol: string | null = null;

  private manuallyDisconnected = false;

  private lastTickKey: string | null = null;

  constructor(engine?: DerivAnalysisEngine) {
    this.engine = engine ?? new DerivAnalysisEngine(1000);
  }

  connect(symbol: string) {
    if (typeof window === "undefined") {
      return;
    }

    this.currentSymbol = symbol;
    this.manuallyDisconnected = false;
    this.reconnectAttempts = 0;

    this.disconnectSocketOnly();

    this.setStatus("connecting");

    /*
     * Deriv public market-data WebSocket.
     *
     * No account login is required for public tick data.
     */
    this.socket = new WebSocket(
      "wss://ws.binaryws.com/websockets/v3"
    );

    this.socket.onopen = () => {
      console.log("Connected to Deriv");

      this.reconnectAttempts = 0;

      this.setStatus("connected");

      /*
       * First request the latest 1,000 historical ticks.
       *
       * This means the analyzer does NOT start from zero
       * when the user opens the website.
       */
      this.socket?.send(
        JSON.stringify({
          ticks_history: symbol,
          count: 1000,
          end: "latest",
          style: "ticks",
          subscribe: 0,
        })
      );

      /*
       * Then subscribe to the live tick stream.
       */
      this.socket?.send(
        JSON.stringify({
          ticks: symbol,
          subscribe: 1,
        })
      );
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        /*
         * Historical tick response
         */
        if (
          data.msg_type === "history" &&
          data.history &&
          Array.isArray(data.history.prices)
        ) {
          const prices = data.history.prices as number[];

          const pipSize =
            typeof data.pip_size === "number"
              ? data.pip_size
              : this.guessPipSize(prices);

          const digits = prices
            .map((price) => this.extractDigit(price, pipSize))
            .filter(
              (digit): digit is number =>
                Number.isInteger(digit) &&
                digit >= 0 &&
                digit <= 9
            );

          /*
           * Clear the old window before loading
           * the historical window.
           */
          this.engine.clear();

          /*
           * We only keep the latest 1,000 ticks.
           */
          this.engine.addTicks(digits.slice(-1000));

          console.log(
            `Loaded ${this.engine.getTickCount()} historical ticks from Deriv`
          );

          /*
           * Do NOT notify digit listeners for all 1,000
           * historical ticks. That would make the UI look
           * like 1,000 new ticks just arrived.
           *
           * Instead, the UI can read the engine's current
           * statistics immediately.
           */
          return;
        }

        /*
         * Live tick response
         */
        if (
          data.msg_type === "tick" &&
          data.tick &&
          typeof data.tick.quote === "number"
        ) {
          const quote = data.tick.quote;

          const epoch =
            typeof data.tick.epoch === "number"
              ? data.tick.epoch
              : Math.floor(Date.now() / 1000);

          const tickSymbol =
            typeof data.tick.symbol === "string"
              ? data.tick.symbol
              : this.currentSymbol ?? "";

          const pipSize =
            typeof data.tick.pip_size === "number"
              ? data.tick.pip_size
              : this.guessPipSizeFromQuote(quote);

          const digit = this.extractDigit(quote, pipSize);

          if (
            !Number.isInteger(digit) ||
            digit < 0 ||
            digit > 9
          ) {
            return;
          }

          /*
           * Protect against receiving the same tick twice.
           */
          const tickKey = `${tickSymbol}-${epoch}-${quote}`;

          if (tickKey === this.lastTickKey) {
            return;
          }

          this.lastTickKey = tickKey;

          const tick: DerivTick = {
            quote,
            epoch,
            digit,
            symbol: tickSymbol,
          };

          this.currentTick = tick;

          /*
           * Add the new live tick to the rolling 1,000-tick
           * analysis window.
           */
          this.engine.addTick(digit);

          /*
           * Notify listeners.
           */
          this.notifyTickListeners(tick);

          this.notifyDigitListeners(digit);

          return;
        }

        /*
         * Deriv can return an error object.
         */
        if (data.error) {
          console.error(
            "Deriv API error:",
            data.error.message ?? data.error
          );

          this.setStatus("error");

          return;
        }
      } catch (error) {
        console.error(
          "Error processing Deriv data:",
          error
        );
      }
    };

    this.socket.onerror = (error) => {
      console.error(
        "Deriv WebSocket error:",
        error
      );

      this.setStatus("error");
    };

    this.socket.onclose = () => {
      console.log("Disconnected from Deriv");

      this.socket = null;

      if (!this.manuallyDisconnected) {
        this.setStatus("disconnected");

        this.scheduleReconnect();
      }
    };
  }

  private scheduleReconnect() {
    if (
      this.manuallyDisconnected ||
      !this.currentSymbol
    ) {
      return;
    }

    if (this.reconnectTimer) {
      return;
    }

    /*
     * Gradually increase reconnect delay.
     *
     * 1s → 2s → 4s → 8s → 16s → maximum 30s
     */
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts),
      30000
    );

    this.reconnectAttempts++;

    console.log(
      `Reconnecting to Deriv in ${delay / 1000}s...`
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;

      if (
        this.currentSymbol &&
        !this.manuallyDisconnected
      ) {
        this.connect(this.currentSymbol);
      }
    }, delay);
  }

  disconnect() {
    this.manuallyDisconnected = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.disconnectSocketOnly();

    this.setStatus("disconnected");
  }

  private disconnectSocketOnly() {
    if (this.socket) {
      try {
        this.socket.close();
      } catch (error) {
        console.error(
          "Error closing Deriv socket:",
          error
        );
      }

      this.socket = null;
    }
  }

  onDigit(listener: DigitListener) {
    this.digitListeners.push(listener);

    return () => {
      this.digitListeners =
        this.digitListeners.filter(
          (item) => item !== listener
        );
    };
  }

  onTick(listener: TickListener) {
    this.tickListeners.push(listener);

    return () => {
      this.tickListeners =
        this.tickListeners.filter(
          (item) => item !== listener
        );
    };
  }

  onStatus(listener: StatusListener) {
    this.statusListeners.push(listener);

    return () => {
      this.statusListeners =
        this.statusListeners.filter(
          (item) => item !== listener
        );
    };
  }

  getEngine() {
    return this.engine;
  }

  getCurrentTick() {
    return this.currentTick;
  }

  getStatus() {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return "connected" as const;
    }

    return "disconnected" as const;
  }

  private notifyDigitListeners(digit: number) {
    this.digitListeners.forEach((listener) => {
      try {
        listener(digit);
      } catch (error) {
        console.error(
          "Digit listener error:",
          error
        );
      }
    });
  }

  private notifyTickListeners(tick: DerivTick) {
    this.tickListeners.forEach((listener) => {
      try {
        listener(tick);
      } catch (error) {
        console.error(
          "Tick listener error:",
          error
        );
      }
    });
  }

  private setStatus(
    status:
      | "connecting"
      | "connected"
      | "disconnected"
      | "error"
  ) {
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error(
          "Status listener error:",
          error
        );
      }
    });
  }

  /*
   * Extract the final displayed digit using pip size.
   *
   * Example:
   * quote = 123.45
   * pipSize = 2
   * digit = 5
   *
   * This is safer than simply removing the decimal point
   * because JSON numbers can lose trailing zeros.
   */
  private extractDigit(
    quote: number,
    pipSize: number
  ): number {
    const decimals = Math.max(
      0,
      Math.min(10, Math.floor(pipSize))
    );

    const formatted = quote.toFixed(decimals);

    const lastCharacter =
      formatted.charAt(formatted.length - 1);

    const digit = Number(lastCharacter);

    if (
      Number.isInteger(digit) &&
      digit >= 0 &&
      digit <= 9
    ) {
      return digit;
    }

    /*
     * Fallback.
     */
    const fallback = Math.abs(
      Math.floor(quote * Math.pow(10, decimals))
    ) % 10;

    return fallback;
  }

  private guessPipSize(prices: number[]): number {
    const sample = prices.find(
      (price) => Number.isFinite(price)
    );

    if (sample === undefined) {
      return 2;
    }

    return this.guessPipSizeFromQuote(sample);
  }

  private guessPipSizeFromQuote(
    quote: number
  ): number {
    const text = String(quote);

    if (!text.includes(".")) {
      return 0;
    }

    return text.split(".")[1]?.length ?? 0;
  }
}
