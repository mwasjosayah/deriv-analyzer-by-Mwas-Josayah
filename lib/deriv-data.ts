import { DerivAnalysisEngine } from "./deriv-engine";

export class DerivDataManager {
  private socket: WebSocket | null = null;
  private engine: DerivAnalysisEngine;
  private listeners: ((digit: number) => void)[] = [];

  constructor(engine?: DerivAnalysisEngine) {
    this.engine = engine ?? new DerivAnalysisEngine(100);
  }

  connect(symbol: string) {
    if (typeof window === "undefined") {
      return;
    }

    this.disconnect();

    this.socket = new WebSocket(
      "wss://ws.derivws.com/websockets/v3?app_id=1089"
    );

    this.socket.onopen = () => {
      console.log("Connected to Deriv");

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

        if (data.tick) {
          const quote = String(data.tick.quote);

          const digit = Number(
            quote.replace(".", "").slice(-1)
          );

          if (
            Number.isInteger(digit) &&
            digit >= 0 &&
            digit <= 9
          ) {
            this.engine.addTick(digit);

            this.listeners.forEach((listener) =>
              listener(digit)
            );
          }
        }
      } catch (error) {
        console.error(
          "Error processing Deriv data:",
          error
        );
      }
    };

    this.socket.onerror = (error) => {
      console.error("Deriv WebSocket error:", error);
    };

    this.socket.onclose = () => {
      console.log("Disconnected from Deriv");
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
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
}
