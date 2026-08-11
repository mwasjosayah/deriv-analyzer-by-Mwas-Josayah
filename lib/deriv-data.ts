import { DerivAnalysisEngine } from "./deriv-engine";

interface DerivDataManagerOptions {
  maxTicks?: number;
}

export class DerivDataManager {
  private socket: WebSocket | null = null;
  private engine: DerivAnalysisEngine;
  private listeners: ((digit: number) => void)[] = [];

  private symbol: string | null = null;
  private isConnected = false;

  constructor(options: DerivDataManagerOptions = {}) {
    const maxTicks = options.maxTicks ?? 500;

    this.engine = new DerivAnalysisEngine(maxTicks);
  }

  connect(symbol: string) {
    if (typeof window === "undefined") {
      return;
    }

    this.disconnect();

    this.symbol = symbol;

    this.socket = new WebSocket(
      "wss://ws.derivws.com/websockets/v3?app_id=1089"
    );

    this.socket.onopen = () => {
      console.log("Connected to Deriv");

      this.isConnected = true;

      /*
       * STEP 1:
       * Request recent tick history first.
       */
      this.socket?.send(
        JSON.stringify({
          ticks_history: symbol,
          count: 500,
          end: "latest",
          style: "ticks",
          adjust_start_time: 1,
        })
      );
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        /*
         * STEP 2:
         * Process historical ticks.
         */
        if (data.history?.prices) {
          const prices = data.history.prices;

          const digits = prices
            .map((price: number | string) =>
              this.extractDigit(price)
            )
            .filter(
              (digit: number | null): digit is number =>
                digit !== null
            );

          this.engine.addTicks(digits);

          digits.forEach((digit) => {
            this.notifyListeners(digit);
          });

          /*
           * STEP 3:
           * Once history is loaded, subscribe to
           * the live tick stream.
           */
          this.socket?.send(
            JSON.stringify({
              ticks: symbol,
              subscribe: 1,
            })
          );

          console.log(
            `Loaded ${digits.length} historical ticks`
          );

          return;
        }

        /*
         * STEP 4:
         * Process every new live tick.
         */
        if (data.tick) {
          const digit = this.extractDigit(
            data.tick.quote
          );

          if (digit !== null) {
            this.engine.addTick(digit);

            this.notifyListeners(digit);
          }
        }

        /*
         * Handle Deriv API errors.
         */
        if (data.error) {
          console.error(
            "Deriv API error:",
            data.error.message
          );
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
    };

    this.socket.onclose = () => {
      console.log("Disconnected from Deriv");

      this.isConnected = false;
    };
  }

  private extractDigit(
    quote: number | string
  ): number | null {
    const value = String(quote);

    /*
     * Get the final digit of the quoted price.
     *
     * Example:
     * 1234.56 → 6
     * 9876.10 → 0
     */
    const cleaned = value.replace(".", "");

    const lastCharacter =
      cleaned.charAt(cleaned.length - 1);

    const digit = Number(lastCharacter);

    if (
      Number.isInteger(digit) &&
      digit >= 0 &&
      digit <= 9
    ) {
      return digit;
    }

    return null;
  }

  private notifyListeners(digit: number) {
    this.listeners.forEach((listener) => {
      listener(digit);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.isConnected = false;
  }

  onDigit(listener: (digit: number) => void) {
    this.listeners.push(listener);

    return () => {
      this.listeners = this.listeners.filter(
        (item) => item !== listener
      );
    };
  }

  getEngine() {
    return this.engine;
  }

  getSymbol() {
    return this.symbol;
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}
