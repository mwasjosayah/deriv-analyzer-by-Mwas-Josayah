export interface DerivTick {
  symbol: string;
  quote: number;
  digit: number;
  epoch: number;
}

export interface DerivDataManagerOptions {
  symbol: string;
  onTick?: (tick: DerivTick) => void;
  onStatusChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

export class DerivDataManager {
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private shouldReconnect = true;

  private readonly symbol: string;
  private readonly onTick?: (tick: DerivTick) => void;
  private readonly onStatusChange?: (
    connected: boolean
  ) => void;
  private readonly onError?: (error: Error) => void;

  constructor(options: DerivDataManagerOptions) {
    this.symbol = options.symbol;
    this.onTick = options.onTick;
    this.onStatusChange = options.onStatusChange;
    this.onError = options.onError;
  }

  connect() {
    if (typeof window === "undefined") {
      return;
    }

    this.shouldReconnect = true;

    if (
      this.socket &&
      this.socket.readyState === WebSocket.OPEN
    ) {
      return;
    }

    this.socket = new WebSocket(
      "wss://ws.derivws.com/websockets/v3?app_id=1089"
    );

    this.socket.onopen = () => {
      this.onStatusChange?.(true);

      this.socket?.send(
        JSON.stringify({
          ticks: this.symbol,
          subscribe: 1,
        })
      );
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.error) {
          this.onError?.(
            new Error(data.error.message)
          );
          return;
        }

        if (data.msg_type !== "tick") {
          return;
        }

        const quote = Number(data.tick?.quote);

        if (!Number.isFinite(quote)) {
          return;
        }

        const digit = this.extractLastDigit(
          quote
        );

        const tick: DerivTick = {
          symbol:
            data.tick?.symbol ?? this.symbol,
          quote,
          digit,
          epoch: Number(
            data.tick?.epoch ??
              Math.floor(Date.now() / 1000)
          ),
        };

        this.onTick?.(tick);
      } catch {
        this.onError?.(
          new Error(
            "Unable to process Deriv tick data."
          )
        );
      }
    };

    this.socket.onerror = () => {
      this.onStatusChange?.(false);

      this.onError?.(
        new Error("Deriv WebSocket connection error.")
      );
    };

    this.socket.onclose = () => {
      this.onStatusChange?.(false);

      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };
  }

  disconnect() {
    this.shouldReconnect = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.onStatusChange?.(false);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;

      if (this.shouldReconnect) {
        this.connect();
      }
    }, 3000);
  }

  private extractLastDigit(
    quote: number
  ): number {
    const text = String(quote);

    const digits = text.replace(
      /\D/g,
      ""
    );

    return Number(
      digits.charAt(digits.length - 1)
    );
  }
}
