import { DerivAnalysisEngine } from "./deriv-engine";

export interface DerivTick {
  quote: number;
  epoch: number;
  digit: number;
  symbol: string;
}

type DigitListener = (
  digit: number
) => void;

type TickListener = (
  tick: DerivTick
) => void;

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

  constructor(
    engine?: DerivAnalysisEngine
  ) {
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

    /*
     * Tell the dashboard that we are
     * attempting to connect.
     */
    this.setStatus("connecting");

    console.log(
      "[Deriv] Connecting to:",
      symbol
    );

    /*
     * Deriv WebSocket endpoint.
     */
    const socket = new WebSocket(
      "wss://ws.binaryws.com/websockets/v3"
    );

    this.socket = socket;

    /*
     * CONNECTION OPENED
     */
    socket.onopen = () => {
      /*
       * Ignore this socket if another socket
       * has already replaced it.
       */
      if (this.socket !== socket) {
        return;
      }

      console.log(
        "[Deriv] WebSocket connected"
      );

      this.setStatus("connected");

      /*
       * STEP 1
       *
       * Ask Deriv for server time.
       * This confirms the API is responding.
       */
      socket.send(
        JSON.stringify({
          time: 1,
          req_id: 1,
        })
      );

      /*
       * STEP 2
       *
       * Load historical ticks.
       */
      socket.send(
        JSON.stringify({
          ticks_history: symbol,
          count: 1000,
          end: "latest",
          style: "ticks",
          subscribe: 0,
          req_id: 2,
        })
      );

      /*
       * STEP 3
       *
       * Subscribe to live ticks.
       */
      socket.send(
        JSON.stringify({
          ticks: symbol,
          subscribe: 1,
          req_id: 3,
        })
      );

      console.log(
        "[Deriv] Tick requests sent for:",
        symbol
      );
    };

    /*
     * MESSAGES FROM DERIV
     */
    socket.onmessage = (event) => {
      /*
       * Ignore messages from an old socket.
       */
      if (this.socket !== socket) {
        return;
      }

      try {
        const data =
          JSON.parse(event.data);

        console.log(
          "[Deriv message]",
          data
        );

        /*
         * SERVER TIME
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
           * Clear previous analysis.
           */
          this.engine.clear();

          /*
           * Add historical digits.
           */
          this.engine.addTicks(
            digits.slice(-1000)
          );

          console.log(
            "[Deriv] Historical ticks loaded:",
            digits.length
          );

          console.log(
            "[Deriv] Analysis tick count:",
            this.engine.getTickCount()
          );

          /*
           * IMPORTANT:
           *
           * Historical ticks also need to appear
           * on the dashboard.
           *
           * Send them through the digit listeners.
           */
          digits
            .slice(-1000)
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
              quote,
              "pip:",
              pipSize
            );

            return;
          }

          const tick: DerivTick = {
            quote,
            epoch,
            digit,
            symbol: tickSymbol,
          };

          this.currentTick = tick;

          /*
           * Add live digit to analysis engine.
           */
          this.engine.addTick(
            digit
          );

          console.log(
            "[Deriv LIVE TICK]",
            tick
          );

          /*
           * Notify tick listeners.
           */
          this.notifyTickListeners(
            tick
          );

          /*
           * Notify digit listeners.
           */
          this.notifyDigitListeners(
            digit
          );

          return;
        }

        /*
         * DERIV API ERROR
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
      }
    };

    /*
     * WEBSOCKET ERROR
     */
    socket.onerror = (error) => {
      if (this.socket !== socket) {
        return;
      }

      console.error(
        "[Deriv WebSocket ERROR]",
        error
      );

      this.setStatus("error");
    };

    /*
     * WEBSOCKET CLOSED
     */
    socket.onclose = (event) => {
      if (this.socket !== socket) {
        return;
      }

      console.log(
        "[Deriv] WebSocket closed",
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
   * DISCONNECT
   */
  disconnect() {
    this.manuallyDisconnected = true;

    if (this.socket) {
      const socket =
        this.socket;

      this.socket = null;

      try {
        /*
         * Stop live tick subscription
         * before closing when possible.
         */
        if (
          socket.readyState ===
          WebSocket.OPEN
        ) {
          if (
            this.currentSymbol
          ) {
            socket.send(
              JSON.stringify({
                forget_all:
                  "ticks",
              })
            );
          }
        }

        socket.close();
      } catch (error) {
        console.error(
          "[Deriv] Error closing socket:",
          error
        );
      }
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

  /*
   * GET ANALYSIS ENGINE
   */
  getEngine() {
    return this.engine;
  }

  /*
   * GET CURRENT TICK
   */
  getCurrentTick() {
    return this.currentTick;
  }

  /*
   * GET CONNECTION STATUS
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
    console.log(
      "[Deriv] Status:",
      status
    );

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
   * GUESS HISTORICAL PIP SIZE
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
      sample ===
      undefined
    ) {
      return 2;
    }

    return this.guessPipSizeFromQuote(
      sample
    );
  }

  /*
   * GUESS LIVE PIP SIZE
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
      text
        .split(".")[1]
        ?.length ?? 0
    );
  }
}
