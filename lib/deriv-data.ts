import { DerivAnalysisEngine } from "./deriv-engine";

export interface DerivTick {
  quote: number;
  epoch: number;
  digit: number;
  symbol: string;
}

type DigitListener = (digit: number) => void;
type TickListener = (tick: DerivTick) => void;

type Status =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

type StatusListener = (status: Status) => void;

export class DerivDataManager {
  private socket: WebSocket | null = null;

  private engine: DerivAnalysisEngine;

  private digitListeners: DigitListener[] = [];
  private tickListeners: TickListener[] = [];
  private statusListeners: StatusListener[] = [];

  private currentSymbol: string | null = null;

  private manuallyDisconnected = false;

  private tickWindow: number;

  constructor(
    engine?: DerivAnalysisEngine,
    tickWindow: number = 1000
  ) {
    this.tickWindow = tickWindow;

    this.engine =
      engine ??
      new DerivAnalysisEngine(tickWindow);
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
      "[Deriv] Starting connection:",
      symbol
    );

    /*
     * Public Deriv market-data WebSocket.
     *
     * No authentication is required for
     * public market data.
     */
    const socket = new WebSocket(
      "wss://ws.binaryws.com/websockets/v3"
    );

    this.socket = socket;

    /*
     * ================================
     * WEBSOCKET OPEN
     * ================================
     */
    socket.onopen = () => {
      console.log(
        "[Deriv] WebSocket OPEN"
      );

      /*
       * The browser WebSocket is now open.
       */
      this.setStatus("connected");

      /*
       * Request server time.
       *
       * This gives us an actual response
       * from Deriv.
       */
      socket.send(
        JSON.stringify({
          time: 1,
          req_id: 1,
        })
      );

      /*
       * Ask Deriv for the currently available
       * symbols.
       *
       * This helps verify that the API is
       * responding correctly.
       */
      socket.send(
        JSON.stringify({
          active_symbols: "brief",
          product_type: "basic",
          req_id: 2,
        })
      );

      /*
       * Request historical ticks for the
       * selected market.
       */
      socket.send(
        JSON.stringify({
          ticks_history: symbol,
          count: this.tickWindow,
          end: "latest",
          style: "ticks",
          subscribe: 0,
          req_id: 3,
        })
      );

      /*
       * Subscribe to NEW live ticks.
       */
      socket.send(
        JSON.stringify({
          ticks: symbol,
          subscribe: 1,
          req_id: 4,
        })
      );

      console.log(
        "[Deriv] Requests sent:",
        {
          symbol,
          tickWindow: this.tickWindow,
        }
      );
    };

    /*
     * ================================
     * WEBSOCKET MESSAGE
     * ================================
     */
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(
          event.data
        );

        console.log(
          "[Deriv] Message:",
          data
        );

        /*
         * SERVER TIME
         */
        if (
          data.msg_type === "time"
        ) {
          console.log(
            "[Deriv] Server responded to time request:",
            data.time
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
          console.log(
            "[Deriv] Active symbols received:",
            data.active_symbols.length
          );

          const selectedSymbol =
            data.active_symbols.find(
              (item: {
                symbol?: string;
              }) =>
                item.symbol === symbol
            );

          if (selectedSymbol) {
            console.log(
              "[Deriv] Selected symbol confirmed:",
              selectedSymbol
            );
          } else {
            console.warn(
              "[Deriv] Selected symbol was NOT found:",
              symbol
            );
          }

          return;
        }

        /*
         * HISTORICAL TICKS
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
            typeof data.pip_size ===
            "number"
              ? data.pip_size
              : this.guessPipSize(
                  prices
                );

          const digits =
            prices
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
           * Reset the engine.
           */
          this.engine.clear();

          /*
           * Add the selected number of
           * historical digits.
           */
          this.engine.addTicks(
            digits.slice(
              -this.tickWindow
            )
          );

          console.log(
            "[Deriv] Historical ticks received:",
            prices.length
          );

          console.log(
            "[Deriv] Historical digits:",
            digits.length
          );

          console.log(
            "[Deriv] Engine tick count:",
            this.engine.getTickCount()
          );

          /*
           * IMPORTANT:
           *
           * Send historical digits to
           * page.tsx as well.
           */
          digits
            .slice(-this.tickWindow)
            .forEach((digit) => {
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
           * pip_size is not guaranteed by
           * the current API, so calculate
           * it when necessary.
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
            symbol: tickSymbol,
          };

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
           * Send the complete tick.
           */
          this.notifyTickListeners(
            tick
          );

          /*
           * Send the digit to the
           * dashboard.
           */
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
            "[Deriv API ERROR]:",
            data.error
          );

          this.setStatus("error");

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
     * ================================
     * WEBSOCKET ERROR
     * ================================
     */
    socket.onerror = (error) => {
      console.error(
        "[Deriv] WebSocket ERROR:",
        error
      );

      this.setStatus("error");
    };

    /*
     * ================================
     * WEBSOCKET CLOSED
     * ================================
     */
    socket.onclose = (event) => {
      console.log(
        "[Deriv] WebSocket CLOSED:",
        {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
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

  /*
   * ================================
   * DISCONNECT
   * ================================
   */
  disconnect() {
    this.manuallyDisconnected = true;

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
   * ================================
   * DIGIT LISTENER
   * ================================
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
   * ================================
   * TICK LISTENER
   * ================================
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
   * ================================
   * STATUS LISTENER
   * ================================
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
   * ================================
   * ENGINE
   * ================================
   */
  getEngine() {
    return this.engine;
  }

  /*
   * ================================
   * STATUS
   * ================================
   */
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
   * ================================
   * NOTIFY DIGIT LISTENERS
   * ================================
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
