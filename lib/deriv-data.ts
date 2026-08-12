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
  status:
    | "connecting"
    | "connected"
    | "disconnected"
    | "error"
) => void;

export class DerivDataManager {
  private socket: WebSocket | null = null;

  private engine: DerivAnalysisEngine;

  private digitListeners: DigitListener[] = [];

  private tickListeners: TickListener[] = [];

  private statusListeners: StatusListener[] = [];

  private currentTick: DerivTick | null = null;

  private currentSymbol: string | null = null;

  private manuallyDisconnected = false;

  constructor(engine?: DerivAnalysisEngine) {
    this.engine =
      engine ??
      new DerivAnalysisEngine(1000);
  }

  connect(symbol: string) {
    if (typeof window === "undefined") {
      return;
    }

    /*
     * Close any previous connection.
     */
    this.disconnect();

    this.currentSymbol = symbol;

    this.manuallyDisconnected = false;

    this.setStatus("connecting");

    console.log(
      "[Deriv] Starting WebSocket connection:",
      symbol
    );

    const socket = new WebSocket(
      "wss://ws.binaryws.com/websockets/v3"
    );

    this.socket = socket;

    /*
     * SOCKET OPEN
     */
    socket.onopen = () => {
      console.log(
        "[Deriv] WebSocket OPEN"
      );

      /*
       * IMPORTANT:
       * Notify the dashboard immediately.
       */
      this.setStatus("connected");

      /*
       * 1. Connection test.
       */
      socket.send(
        JSON.stringify({
          ping: 1,
          req_id: 1,
        })
      );

      /*
       * 2. Request active symbols.
       *
       * This allows us to confirm that
       * the selected market exists.
       */
      socket.send(
        JSON.stringify({
          active_symbols: "brief",
          req_id: 2,
        })
      );

      /*
       * 3. Request historical ticks.
       */
      socket.send(
        JSON.stringify({
          ticks_history: symbol,
          count: 1000,
          end: "latest",
          style: "ticks",
          subscribe: 0,
          req_id: 3,
        })
      );

      /*
       * 4. Subscribe to live ticks.
       */
      socket.send(
        JSON.stringify({
          ticks: symbol,
          subscribe: 1,
          req_id: 4,
        })
      );

      console.log(
        "[Deriv] Market requests sent:",
        symbol
      );
    };

    /*
     * SOCKET MESSAGE
     */
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(
          event.data
        );

        /*
         * PING RESPONSE
         */
        if (
          data.msg_type === "ping"
        ) {
          console.log(
            "[Deriv] Ping successful"
          );

          return;
        }

        /*
         * ACTIVE SYMBOLS
         */
        if (
          data.msg_type ===
            "active_symbols" &&
          Array.isArray(
            data.active_symbols
          )
        ) {
          const foundMarket =
            data.active_symbols.find(
              (market: any) =>
                market.underlying_symbol ===
                  this.currentSymbol ||
                market.symbol ===
                  this.currentSymbol
            );

          if (foundMarket) {
            console.log(
              "[Deriv] Market confirmed:",
              this.currentSymbol
            );
          } else {
            console.warn(
              "[Deriv] Selected market was not found in active symbols:",
              this.currentSymbol
            );
          }

          return;
        }

        /*
         * HISTORICAL TICKS
         */
        if (
          data.msg_type === "history" &&
          data.history &&
          Array.isArray(
            data.history.prices
          )
        ) {
          const prices =
            data.history.prices as number[];

          const pipSize =
            typeof data.pip_size ===
            "number"
              ? data.pip_size
              : this.guessPipSize(
                  prices
                );

          const digits = prices
            .map((price) =>
              this.extractDigit(
                price,
                pipSize
              )
            )
            .filter(
              (
                digit
              ): digit is number =>
                Number.isInteger(
                  digit
                ) &&
                digit >= 0 &&
                digit <= 9
            );

          /*
           * Start the analysis engine
           * with historical data.
           */
          this.engine.clear();

          this.engine.addTicks(
            digits
          );

          console.log(
            "[Deriv] Historical ticks loaded:",
            digits.length
          );

          console.log(
            "[Deriv] Engine tick count:",
            this.engine.getTickCount()
          );

          /*
           * Send historical digits to
           * the dashboard as well.
           */
          digits.forEach((digit) => {
            this.notifyDigitListeners(
              digit
            );
          });

          return;
        }

        /*
         * LIVE TICK
         */
        if (
          data.msg_type === "tick" &&
          data.tick &&
          typeof data.tick.quote ===
            "number"
        ) {
          const quote =
            data.tick.quote;

          const epoch =
            typeof data.tick.epoch ===
            "number"
              ? data.tick.epoch
              : Math.floor(
                  Date.now() / 1000
                );

          const tickSymbol =
            typeof data.tick.symbol ===
            "string"
              ? data.tick.symbol
              : this.currentSymbol ??
                "";

          /*
           * Deriv may provide pip_size
           * on the tick.
           *
           * If not, determine decimal
           * places from the quote.
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
            console.warn(
              "[Deriv] Invalid digit:",
              digit,
              "quote:",
              quote
            );

            return;
          }

          const tick: DerivTick = {
            quote,
            epoch,
            digit,
            symbol: tickSymbol,
          };

          this.currentTick =
            tick;

          /*
           * Add to analysis engine.
           */
          this.engine.addTick(
            digit
          );

          console.log(
            "[Deriv] LIVE TICK:",
            tick
          );

          /*
           * Notify dashboard.
           */
          this.notifyTickListeners(
            tick
          );

          this.notifyDigitListeners(
            digit
          );

          return;
        }

        /*
         * DERIV ERROR
         */
        if (data.error) {
          console.error(
            "[Deriv API ERROR]",
            data.error
          );

          this.setStatus("error");

          return;
        }
      } catch (error) {
        console.error(
          "[Deriv] Message processing error:",
          error
        );

        this.setStatus("error");
      }
    };

    /*
     * SOCKET ERROR
     */
    socket.onerror = (error) => {
      console.error(
        "[Deriv WebSocket ERROR]",
        error
      );

      this.setStatus("error");
    };

    /*
     * SOCKET CLOSED
     */
    socket.onclose = (event) => {
      console.log(
        "[Deriv] WebSocket closed:",
        {
          code: event.code,
          reason: event.reason,
          wasClean:
            event.wasClean,
        }
      );

      this.socket = null;

      if (
        !this.manuallyDisconnected
      ) {
        this.setStatus(
          "disconnected"
        );
      }
    };
  }

  disconnect() {
    this.manuallyDisconnected = true;

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

    this.setStatus(
      "disconnected"
    );
  }

  /*
   * DIGIT LISTENER
   */
  onDigit(
    listener: DigitListener
  ) {
    this.digitListeners.push(
      listener
    );

    return () => {
      this.digitListeners =
        this.digitListeners.filter(
          (item) =>
            item !== listener
        );
    };
  }

  /*
   * TICK LISTENER
   */
  onTick(
    listener: TickListener
  ) {
    this.tickListeners.push(
      listener
    );

    return () => {
      this.tickListeners =
        this.tickListeners.filter(
          (item) =>
            item !== listener
        );
    };
  }

  /*
   * STATUS LISTENER
   */
  onStatus(
    listener: StatusListener
  ) {
    this.statusListeners.push(
      listener
    );

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

  /*
   * NOTIFY DIGIT LISTENERS
   */
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

  /*
   * NOTIFY TICK LISTENERS
   */
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

  /*
   * NOTIFY STATUS LISTENERS
   */
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

  /*
   * EXTRACT LAST DIGIT
   */
  private extractDigit(
    quote: number,
    pipSize: number
  ): number {
    const decimals =
      Math.max(
        0,
        Math.min(
          10,
          Math.floor(
            pipSize
          )
        )
      );

    const formatted =
      quote.toFixed(
        decimals
      );

    const lastCharacter =
      formatted.charAt(
        formatted.length - 1
      );

    const digit =
      Number(
        lastCharacter
      );

    if (
      Number.isInteger(
        digit
      ) &&
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

  /*
   * DETERMINE DECIMAL PLACES
   * FROM HISTORICAL PRICES
   */
  private guessPipSize(
    prices: number[]
  ): number {
    const sample =
      prices.find(
        (price) =>
          Number.isFinite(
            price
          )
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

  /*
   * DETERMINE DECIMAL PLACES
   * FROM LIVE QUOTE
   */
  private guessPipSizeFromQuote(
    quote: number
  ): number {
    const text =
      String(quote);

    if (
      !text.includes(".")
    ) {
      return 0;
    }

    return (
      text.split(".")[1]
        ?.length ?? 0
    );
  }
}
