import { DerivAnalysisEngine } from "./deriv-engine";

export interface DerivTick {
  quote: number;
  epoch: number;
  digit: number;
  symbol: string;
}

type DigitListener = (digit: number) => void;

type TickListener = (
  tick: DerivTick
) => void;

type Status =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

type StatusListener = (
  status: Status
) => void;

export class DerivDataManager {
  private socket: WebSocket | null = null;

  private engine: DerivAnalysisEngine;

  private digitListeners: DigitListener[] = [];

  private tickListeners: TickListener[] = [];

  private statusListeners: StatusListener[] = [];

  private currentSymbol: string | null = null;

  private manuallyDisconnected = false;

  private tickWindow: number;

  private historicalLoaded = false;

  constructor(
    engine?: DerivAnalysisEngine,
    tickWindow: number = 1000
  ) {
    this.tickWindow = tickWindow;

    this.engine =
      engine ??
      new DerivAnalysisEngine(
        tickWindow
      );
  }

  /*
   * =====================================
   * CONNECT
   * =====================================
   */

  connect(symbol: string) {
    if (
      typeof window === "undefined"
    ) {
      return;
    }

    /*
     * Close previous connection.
     */

    this.disconnect();

    this.currentSymbol = symbol;

    this.manuallyDisconnected = false;

    this.historicalLoaded = false;

    this.setStatus("connecting");

    console.log(
      "[Deriv] Starting connection:",
      symbol
    );

    /*
     * IMPORTANT:
     *
     * app_id=1089 is explicitly included.
     */

    const socket = new WebSocket(
      "wss://ws.binaryws.com/websockets/v3?app_id=1089"
    );

    this.socket = socket;

    /*
     * =====================================
     * OPEN
     * =====================================
     */

    socket.onopen = () => {
      console.log(
        "[Deriv] WebSocket OPEN"
      );

      /*
       * Request server time.
       */

      this.send({
        time: 1,
        req_id: 1,
      });

      /*
       * Request available symbols.
       */

      this.send({
        active_symbols: "brief",
        product_type: "basic",
        req_id: 2,
      });

      /*
       * Request historical ticks.
       */

      this.send({
        ticks_history: symbol,
        count: this.tickWindow,
        end: "latest",
        style: "ticks",
        subscribe: 0,
        req_id: 3,
      });

      /*
       * Subscribe to live ticks.
       */

      this.send({
        ticks: symbol,
        subscribe: 1,
        req_id: 4,
      });

      console.log(
        "[Deriv] API requests sent:",
        {
          symbol,
          tickWindow:
            this.tickWindow,
        }
      );
    };

    /*
     * =====================================
     * MESSAGE
     * =====================================
     */

    socket.onmessage = (
      event
    ) => {
      try {
        const data = JSON.parse(
          event.data
        );

        console.log(
          "[Deriv] Message:",
          data
        );

        /*
         * =================================
         * ERROR
         * =================================
         */

        if (data.error) {
          console.error(
            "[Deriv API ERROR]:",
            data.error
          );

          this.setStatus("error");

          return;
        }

        /*
         * =================================
         * SERVER TIME
         * =================================
         */

        if (
          data.msg_type === "time"
        ) {
          console.log(
            "[Deriv] Server time:",
            data.time
          );

          return;
        }

        /*
         * =================================
         * ACTIVE SYMBOLS
         * =================================
         */

        if (
          data.msg_type ===
            "active_symbols" &&
          Array.isArray(
            data.active_symbols
          )
        ) {
          console.log(
            "[Deriv] Active symbols received:",
            data.active_symbols.length
          );

          const selectedSymbol =
            data.active_symbols.find(
              (item: {
                symbol?: string;
              }) =>
                item.symbol ===
                symbol
            );

          if (
            selectedSymbol
          ) {
            console.log(
              "[Deriv] Selected market confirmed:",
              selectedSymbol
            );
          } else {
            console.warn(
              "[Deriv] Selected market was not found:",
              symbol
            );
          }

          return;
        }

        /*
         * =================================
         * HISTORICAL TICKS
         * =================================
         */

        if (
          data.msg_type ===
            "history" &&
          data.history &&
          Array.isArray(
            data.history.prices
          )
        ) {
          const prices =
            data.history.prices as number[];

          const pipSize =
            this.getPipSize(
              data,
              prices
            );

          const digits =
            prices
              .map(
                (price) =>
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
           * Reset analysis engine.
           */

          this.engine.clear();

          /*
           * Keep only the requested
           * analysis window.
           */

          const selectedDigits =
            digits.slice(
              -this.tickWindow
            );

          this.engine.addTicks(
            selectedDigits
          );

          this.historicalLoaded =
            true;

          console.log(
            "[Deriv] Historical ticks:",
            prices.length
          );

          console.log(
            "[Deriv] Historical digits:",
            selectedDigits.length
          );

          console.log(
            "[Deriv] Engine tick count:",
            this.engine.getTickCount()
          );

          /*
           * Send historical digits
           * to dashboard.
           */

          selectedDigits.forEach(
            (digit) => {
              this.notifyDigitListeners(
                digit
              );
            }
          );

          /*
           * If the live subscription has
           * already started, the dashboard
           * is now considered connected.
           */

          if (
            this.socket &&
            this.socket.readyState ===
              WebSocket.OPEN
          ) {
            this.setStatus(
              "connected"
            );
          }

          return;
        }

        /*
         * =================================
         * LIVE TICK
         * =================================
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
                  Date.now() /
                    1000
                );

          const tickSymbol =
            typeof data.tick.symbol ===
            "string"
              ? data.tick.symbol
              : this.currentSymbol ??
                "";

          const pipSize =
            this.getPipSizeFromTick(
              data.tick,
              quote
            );

          const digit =
            this.extractDigit(
              quote,
              pipSize
            );

          if (
            !Number.isInteger(
              digit
            ) ||
            digit < 0 ||
            digit > 9
          ) {
            console.warn(
              "[Deriv] Invalid digit:",
              {
                quote,
                pipSize,
                digit,
              }
            );

            return;
          }

          const tick: DerivTick = {
            quote,
            epoch,
            digit,
            symbol:
              tickSymbol,
          };

          /*
           * Add live digit to engine.
           */

          this.engine.addTick(
            digit
          );

          /*
           * Notify complete tick.
           */

          this.notifyTickListeners(
            tick
          );

          /*
           * Notify dashboard.
           */

          this.notifyDigitListeners(
            digit
          );

          /*
           * A valid live tick confirms
           * that the API is actually
           * delivering market data.
           */

          if (
            this.socket &&
            this.socket.readyState ===
              WebSocket.OPEN
          ) {
            this.setStatus(
              "connected"
            );
          }

          console.log(
            "[Deriv] LIVE TICK:",
            tick
          );

          return;
        }
      } catch (error) {
        console.error(
          "[Deriv] Failed to process message:",
          error
        );
      }
    };

    /*
     * =====================================
     * ERROR
     * =====================================
     */

    socket.onerror = (
      error
    ) => {
      console.error(
        "[Deriv] WebSocket ERROR:",
        error
      );

      this.setStatus("error");
    };

    /*
     * =====================================
     * CLOSE
     * =====================================
     */

    socket.onclose = (
      event
    ) => {
      console.log(
        "[Deriv] WebSocket CLOSED:",
        {
          code:
            event.code,
          reason:
            event.reason,
          wasClean:
            event.wasClean,
        }
      );

      if (
        this.socket ===
        socket
      ) {
        this.socket = null;
      }

      if (
        !this.manuallyDisconnected
      ) {
        this.setStatus(
          "disconnected"
        );
      }
    };
  }

  /*
   * =====================================
   * SEND
   * =====================================
   */

  private send(
    payload: Record<
      string,
      unknown
    >
  ) {
    if (
      !this.socket ||
      this.socket.readyState !==
        WebSocket.OPEN
    ) {
      console.warn(
        "[Deriv] Cannot send. WebSocket is not open."
      );

      return;
    }

    try {
      this.socket.send(
        JSON.stringify(
          payload
        )
      );
    } catch (error) {
      console.error(
        "[Deriv] Failed to send request:",
        error
      );
    }
  }

  /*
   * =====================================
   * DISCONNECT
   * =====================================
   */

  disconnect() {
    this.manuallyDisconnected =
      true;

    this.historicalLoaded =
      false;

    if (this.socket) {
      try {
        this.socket.close();
      } catch (error) {
        console.error(
          "[Deriv] Error closing WebSocket:",
          error
        );
      }

      this.socket = null;
    }
  }

  /*
   * =====================================
   * DIGIT LISTENER
   * =====================================
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
   * =====================================
   * TICK LISTENER
   * =====================================
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
   * =====================================
   * STATUS LISTENER
   * =====================================
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

  /*
   * =====================================
   * ENGINE
   * =====================================
   */

  getEngine() {
    return this.engine;
  }

  /*
   * =====================================
   * STATUS
   * =====================================
   */

  getStatus(): Status {
    if (
      this.socket &&
      this.socket.readyState ===
        WebSocket.OPEN
    ) {
      return "connected";
    }

    return "disconnected";
  }

  /*
   * =====================================
   * TICK WINDOW
   * =====================================
   */

  getTickWindow() {
    return this.tickWindow;
  }

  /*
   * =====================================
   * DIGIT NOTIFICATION
   * =====================================
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
   * =====================================
   * TICK NOTIFICATION
   * =====================================
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
   * =====================================
   * STATUS NOTIFICATION
   * =====================================
   */

  private setStatus(
    status: Status
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
   * =====================================
   * PIP SIZE
   * =====================================
   */

  private getPipSize(
    data: any,
    prices: number[]
  ) {
    if (
      typeof data.pip_size ===
      "number"
    ) {
      return data.pip_size;
    }

    return this.guessPipSize(
      prices
    );
  }

  private getPipSizeFromTick(
    tick: any,
    quote: number
  ) {
    if (
      typeof tick.pip_size ===
      "number"
    ) {
      return tick.pip_size;
    }

    return this.guessPipSizeFromQuote(
      quote
    );
  }

  /*
   * =====================================
   * GUESS PIP SIZE
   * =====================================
   */

  private guessPipSize(
    prices: number[]
  ) {
    if (
      prices.length === 0
    ) {
      return 1;
    }

    const sample =
      prices[
        prices.length - 1
      ];

    return this.guessPipSizeFromQuote(
      sample
    );
  }

  private guessPipSizeFromQuote(
    quote: number
  ) {
    const text =
      String(quote);

    if (
      text.includes("e-")
    ) {
      const exponent =
        Number(
          text.split("e-")[1]
        );

      if (
        Number.isFinite(
          exponent
        )
      ) {
        return Math.pow(
          10,
          -exponent
        );
      }
    }

    const decimalIndex =
      text.indexOf(".");

    if (
      decimalIndex === -1
    ) {
      return 1;
    }

    const decimalPlaces =
      text.length -
      decimalIndex -
      1;

    return Math.pow(
      10,
      -decimalPlaces
    );
  }

  /*
   * =====================================
   * EXTRACT LAST DIGIT
   * =====================================
   */

  private extractDigit(
    price: number,
    pipSize: number
  ) {
    if (
      !Number.isFinite(price)
    ) {
      return NaN;
    }

    if (
      !Number.isFinite(
        pipSize
      ) ||
      pipSize <= 0
    ) {
      return NaN;
    }

    /*
     * Convert the quote into the
     * smallest displayed price unit.
     */

    const scaled =
      Math.round(
        price / pipSize
      );

    return Math.abs(
      scaled
    ) % 10;
  }
}
