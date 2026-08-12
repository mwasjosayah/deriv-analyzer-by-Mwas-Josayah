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
    this.lastTickKey = null;

    this.disconnectSocketOnly();

    this.setStatus("connecting");

    console.log(
      `[Deriv] Connecting to ${symbol}...`
    );

    this.socket = new WebSocket(
      "wss://ws.binaryws.com/websockets/v3"
    );

    this.socket.onopen = () => {
      console.log(
        `[Deriv] WebSocket connected for ${symbol}`
      );

      this.reconnectAttempts = 0;

      /*
       * IMPORTANT:
       * Tell the page that the WebSocket itself
       * is connected.
       *
       * We no longer wait for a tick before doing this.
       */
      this.setStatus("connected");

      /*
       * Request the previous 1,000 ticks.
       */
      const historyRequest = {
        ticks_history: symbol,
        count: 1000,
        end: "latest",
        style: "ticks",
        subscribe: 0,
      };

      console.log(
        "[Deriv] Requesting 1,000 historical ticks..."
      );

      this.socket?.send(
        JSON.stringify(historyRequest)
      );

      /*
       * Subscribe to future live ticks.
       */
      const liveRequest = {
        ticks: symbol,
        subscribe: 1,
      };

      console.log(
        "[Deriv] Subscribing to live ticks..."
      );

      this.socket?.send(
        JSON.stringify(liveRequest)
      );
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        console.log(
          "[Deriv] Message:",
          data.msg_type
        );

        /*
         * ============================
         * ERROR RESPONSE
         * ============================
         */
        if (data.error) {
          console.error(
            "[Deriv] API error:",
            data.error.message ?? data.error
          );

          this.setStatus("error");

          return;
        }

        /*
         * ============================
         * HISTORICAL TICKS
         * ============================
         */
        if (
          data.msg_type === "history" &&
          data.history &&
          Array.isArray(data.history.prices)
        ) {
          const prices =
            data.history.prices as number[];

          const times =
            Array.isArray(data.history.times)
              ? (data.history.times as number[])
              : [];

          /*
           * Deriv gives us the pip size.
           *
           * Example:
           * pip_size = 2
           * 123.45 -> final digit = 5
           */
          const pipSize =
            typeof data.pip_size === "number"
              ? data.pip_size
              : this.guessPipSize(prices);

          const digits = prices
            .map((price) =>
              this.extractDigit(
                price,
                pipSize
              )
            )
            .filter(
              (digit): digit is number =>
                Number.isInteger(digit) &&
                digit >= 0 &&
                digit <= 9
            );

          /*
           * Reset the analysis window.
           */
          this.engine.clear();

          /*
           * Load the latest 1,000 historical digits.
           */
          const initialDigits =
            digits.slice(-1000);

          this.engine.addTicks(initialDigits);

          console.log(
            `[Deriv] Loaded ${initialDigits.length} historical ticks`
          );

          /*
           * Send historical digits to the UI.
           *
           * This is the part that was missing before.
           */
          initialDigits.forEach(
            (digit: number) => {
              this.notifyDigitListeners(digit);
            }
          );

          /*
           * Set the most recent historical tick
           * as the current tick until the first
           * live tick arrives.
           */
          if (prices.length > 0) {
            const latestIndex =
              prices.length - 1;

            const latestQuote =
              prices[latestIndex];

            const latestEpoch =
              times[latestIndex] ??
              Math.floor(Date.now() / 1000);

            const latestDigit =
              this.extractDigit(
                latestQuote,
                pipSize
              );

            this.currentTick = {
              quote: latestQuote,
              epoch: latestEpoch,
              digit: latestDigit,
              symbol:
                this.currentSymbol ?? "",
            };
          }

          return;
        }

        /*
         * ============================
         * LIVE TICK
         * ============================
         */
        if (
          data.msg_type === "tick" &&
          data.tick &&
          typeof data.tick.quote === "number"
        ) {
          const quote =
            data.tick.quote;

          const epoch =
            typeof data.tick.epoch === "number"
              ? data.tick.epoch
              : Math.floor(
                  Date.now() / 1000
                );

          const tickSymbol =
            typeof data.tick.symbol === "string"
              ? data.tick.symbol
              : this.currentSymbol ?? "";

          /*
           * Prefer pip_size supplied by Deriv.
           */
          const pipSize =
            typeof data.tick.pip_size ===
            "number"
              ? data.tick.pip_size
              : this.guessPipSizeFromQuote(
                  quote
                );

          const digit =
            this.extractDigit(
              quote,
              pipSize
            );

          if (
            !Number.isInteger(digit) ||
            digit < 0 ||
            digit > 9
          ) {
            return;
          }

          /*
           * Prevent duplicate ticks.
           */
          const tickKey =
            `${tickSymbol}-${epoch}-${quote}`;

          if (
            tickKey === this.lastTickKey
          ) {
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
           * Add live digit to rolling
           * analysis window.
           */
          this.engine.addTick(digit);

          console.log(
            `[Deriv] LIVE TICK: ${quote} | Digit: ${digit}`
          );

          /*
           * Notify the UI.
           */
          this.notifyTickListeners(tick);

          this.notifyDigitListeners(digit);

          return;
        }
      } catch (error) {
        console.error(
          "[Deriv] Error processing message:",
          error
        );
      }
    };

    this.socket.onerror = (error) => {
      console.error(
        "[Deriv] WebSocket error:",
        error
      );

      this.setStatus("error");
    };

    this.socket.onclose = (event) => {
      console.log(
        `[Deriv] WebSocket closed. Code: ${event.code}`
      );

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

    const delay = Math.min(
      1000 *
        Math.pow(
          2,
          this.reconnectAttempts
        ),
      30000
    );

    this.reconnectAttempts++;

    console.log(
      `[Deriv] Reconnecting in ${
        delay / 1000
      } seconds...`
    );

    this.reconnectTimer =
      setTimeout(() => {
        this.reconnectTimer = null;

        if (
          this.currentSymbol &&
          !this.manuallyDisconnected
        ) {
          this.connect(
            this.currentSymbol
          );
        }
      }, delay);
  }

  disconnect() {
    this.manuallyDisconnected = true;

    if (this.reconnectTimer) {
      clearTimeout(
        this.reconnectTimer
      );

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
          "[Deriv] Error closing socket:",
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
          (item) =>
            item !== listener
        );
    };
  }

  onTick(listener: TickListener) {
    this.tickListeners.push(listener);

    return () => {
      this.tickListeners =
        this.tickListeners.filter(
          (item) =>
            item !== listener
        );
    };
  }

  onStatus(listener: StatusListener) {
    this.statusListeners.push(listener);

    return () => {
      this.statusListeners =
        this.statusListeners.filter(
          (item) =>
            item !== listener
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
    if (
      this.socket &&
      this.socket.readyState ===
        WebSocket.OPEN
    ) {
      return "connected" as const;
    }

    return "disconnected" as const;
  }

  private notifyDigitListeners(
    digit: number
  ) {
    this.digitListeners.forEach(
      (listener) => {
        try {
          listener(digit);
        } catch (error) {
          console.error(
            "[Deriv] Digit listener error:",
            error
          );
        }
      }
    );
  }

  private notifyTickListeners(
    tick: DerivTick
  ) {
    this.tickListeners.forEach(
      (listener) => {
        try {
          listener(tick);
        } catch (error) {
          console.error(
            "[Deriv] Tick listener error:",
            error
          );
        }
      }
    );
  }

  private setStatus(
    status:
      | "connecting"
      | "connected"
      | "disconnected"
      | "error"
  ) {
    this.statusListeners.forEach(
      (listener) => {
        try {
          listener(status);
        } catch (error) {
          console.error(
            "[Deriv] Status listener error:",
            error
          );
        }
      }
    );
  }

  private extractDigit(
    quote: number,
    pipSize: number
  ): number {
    const decimals = Math.max(
      0,
      Math.min(
        10,
        Math.floor(pipSize)
      )
    );

    const formatted =
      quote.toFixed(decimals);

    const lastCharacter =
      formatted.charAt(
        formatted.length - 1
      );

    const digit =
      Number(lastCharacter);

    if (
      Number.isInteger(digit) &&
      digit >= 0 &&
      digit <= 9
    ) {
      return digit;
    }

    const fallback =
      Math.abs(
        Math.floor(
          quote *
            Math.pow(
              10,
              decimals
            )
        )
      ) % 10;

    return fallback;
  }

  private guessPipSize(
    prices: number[]
  ): number {
    const sample =
      prices.find(
        (price) =>
          Number.isFinite(price)
      );

    if (
      sample === undefined
    ) {
      return 2;
    }

    return this.guessPipSizeFromQuote(
      sample
    );
  }

  private guessPipSizeFromQuote(
    quote: number
  ): number {
    const text = String(quote);

    if (!text.includes(".")) {
      return 0;
    }

    return (
      text.split(".")[1]?.length ??
      0
    );
  }
}
