import { DerivAnalysisEngine } from "./deriv-engine";

type DerivStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

interface DerivTickResponse {
  msg_type?: string;

  tick?: {
    symbol?: string;
    quote?: number | string;
    epoch?: number;
  };

  error?: {
    code?: string;
    message?: string;
  };
}

type DigitListener = (digit: number) => void;
type StatusListener = (status: DerivStatus) => void;

export class DerivDataManager {
  private socket: WebSocket | null = null;

  private readonly engine: DerivAnalysisEngine;

  private readonly digitListeners: DigitListener[] = [];

  private readonly statusListeners: StatusListener[] = [];

  private currentSymbol: string | null = null;

  private isManualDisconnect = false;

  private reconnectTimer: ReturnType<typeof setTimeout> | null =
    null;

  private readonly appId = 1089;

  private readonly websocketUrl =
    `wss://ws.binaryws.com/websockets/v3?app_id=${this.appId}`;

  constructor(
    engine: DerivAnalysisEngine
  ) {
    this.engine = engine;
  }

  /**
   * Register a listener for incoming digits.
   */
  onDigit(
    listener: DigitListener
  ): () => void {
    this.digitListeners.push(listener);

    return () => {
      const index =
        this.digitListeners.indexOf(
          listener
        );

      if (index !== -1) {
        this.digitListeners.splice(
          index,
          1
        );
      }
    };
  }

  /**
   * Register a listener for connection status.
   */
  onStatus(
    listener: StatusListener
  ): () => void {
    this.statusListeners.push(listener);

    return () => {
      const index =
        this.statusListeners.indexOf(
          listener
        );

      if (index !== -1) {
        this.statusListeners.splice(
          index,
          1
        );
      }
    };
  }

  /**
   * Notify all status listeners.
   */
  private notifyStatus(
    status: DerivStatus
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

  /**
   * Notify all digit listeners.
   */
  private notifyDigit(
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

  /**
   * Connect to Deriv and subscribe to ticks.
   */
  connect(
    symbol: string
  ) {
    if (
      typeof window === "undefined"
    ) {
      return;
    }

    this.currentSymbol = symbol;

    this.isManualDisconnect = false;

    this.clearReconnectTimer();

    /*
     * Close an existing connection
     * before creating a new one.
     */
    if (
      this.socket &&
      (
        this.socket.readyState ===
          WebSocket.OPEN ||
        this.socket.readyState ===
          WebSocket.CONNECTING
      )
    ) {
      try {
        this.socket.close();
      } catch (error) {
        console.error(
          "[Deriv] Error closing previous socket:",
          error
        );
      }
    }

    this.notifyStatus(
      "connecting"
    );

    console.log(
      "[Deriv] Connecting to:",
      this.websocketUrl
    );

    console.log(
      "[Deriv] Requested symbol:",
      symbol
    );

    try {
      this.socket = new WebSocket(
        this.websocketUrl
      );

      this.socket.onopen = () => {
        console.log(
          "[Deriv] WebSocket connected"
        );

        this.notifyStatus(
          "connected"
        );

        this.subscribeToTicks(
          symbol
        );
      };

      this.socket.onmessage = (
        event
      ) => {
        this.handleMessage(
          event.data
        );
      };

      this.socket.onerror = (
        error
      ) => {
        console.error(
          "[Deriv] WebSocket error:",
          error
        );

        this.notifyStatus(
          "error"
        );
      };

      this.socket.onclose = (
        event
      ) => {
        console.log(
          "[Deriv] WebSocket closed:",
          event.code,
          event.reason
        );

        this.socket = null;

        this.notifyStatus(
          "disconnected"
        );

        /*
         * Only reconnect when the
         * disconnect was unexpected.
         */
        if (
          !this.isManualDisconnect &&
          this.currentSymbol
        ) {
          this.scheduleReconnect();
        }
      };
    } catch (error) {
      console.error(
        "[Deriv] Failed to create WebSocket:",
        error
      );

      this.socket = null;

      this.notifyStatus(
        "error"
      );
    }
  }

  /**
   * Subscribe to live ticks.
   */
  private subscribeToTicks(
    symbol: string
  ) {
    if (
      !this.socket ||
      this.socket.readyState !==
        WebSocket.OPEN
    ) {
      console.error(
        "[Deriv] Cannot subscribe: socket is not open"
      );

      return;
    }

    const request = {
      ticks: symbol,
      subscribe: 1,
    };

    console.log(
      "[Deriv] Subscribing to:",
      symbol
    );

    try {
      this.socket.send(
        JSON.stringify(request)
      );
    } catch (error) {
      console.error(
        "[Deriv] Failed to subscribe:",
        error
      );

      this.notifyStatus(
        "error"
      );
    }
  }

  /**
   * Process messages received from Deriv.
   */
  private handleMessage(
    rawMessage: unknown
  ) {
    if (
      typeof rawMessage !==
      "string"
    ) {
      return;
    }

    let data: DerivTickResponse;

    try {
      data =
        JSON.parse(
          rawMessage
        ) as DerivTickResponse;
    } catch (error) {
      console.error(
        "[Deriv] Failed to parse message:",
        error
      );

      return;
    }

    /*
     * Deriv API error.
     */
    if (data.error) {
      console.error(
        "[Deriv] API error:",
        data.error.code,
        data.error.message
      );

      this.notifyStatus(
        "error"
      );

      return;
    }

    /*
     * We only process tick
     * messages here.
     */
    if (
      data.msg_type !== "tick" ||
      !data.tick
    ) {
      return;
    }

    const quote =
      data.tick.quote;

    if (
      quote === undefined ||
      quote === null
    ) {
      return;
    }

    const digit =
      this.extractLastDigit(
        quote
      );

    if (digit === null) {
      return;
    }

    console.log(
      "[Deriv] Tick:",
      quote,
      "Digit:",
      digit
    );

    /*
     * Store the digit inside
     * the analysis engine.
     */
    this.engine.addTick(
      digit
    );

    /*
     * Notify the dashboard.
     */
    this.notifyDigit(
      digit
    );
  }

  /**
   * Extract the final decimal digit
   * from a Deriv quote.
   */
  private extractLastDigit(
    quote: number | string
  ): number | null {
    const quoteString =
      String(quote);

    /*
     * Remove scientific notation
     * problems by first checking
     * the decimal portion.
     */
    if (
      quoteString.includes(".")
    ) {
      const decimalPart =
        quoteString.split(
          "."
        )[1];

      if (
        decimalPart &&
        decimalPart.length > 0
      ) {
        const lastCharacter =
          decimalPart[
            decimalPart.length - 1
          ];

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
      }
    }

    /*
     * Fallback for integer-like
     * quote values.
     */
    const digits =
      quoteString.match(
        /\d/g
      );

    if (
      !digits ||
      digits.length === 0
    ) {
      return null;
    }

    const lastDigit =
      Number(
        digits[
          digits.length - 1
        ]
      );

    if (
      !Number.isInteger(
        lastDigit
      ) ||
      lastDigit < 0 ||
      lastDigit > 9
    ) {
      return null;
    }

    return lastDigit;
  }

  /**
   * Schedule a reconnect after
   * an unexpected disconnect.
   */
  private scheduleReconnect() {
    this.clearReconnectTimer();

    this.reconnectTimer =
      setTimeout(() => {
        if (
          this.currentSymbol &&
          !this.isManualDisconnect
        ) {
          console.log(
            "[Deriv] Attempting reconnect..."
          );

          this.connect(
            this.currentSymbol
          );
        }
      }, 3000);
  }

  /**
   * Clear pending reconnect.
   */
  private clearReconnectTimer() {
    if (
      this.reconnectTimer !==
      null
    ) {
      clearTimeout(
        this.reconnectTimer
      );

      this.reconnectTimer =
        null;
    }
  }

  /**
   * Disconnect from Deriv.
   */
  disconnect() {
    console.log(
      "[Deriv] Disconnecting..."
    );

    this.isManualDisconnect =
      true;

    this.currentSymbol =
      null;

    this.clearReconnectTimer();

    if (this.socket) {
      try {
        /*
         * Unsubscribe from ticks
         * before closing when possible.
         */
        if (
          this.socket.readyState ===
          WebSocket.OPEN
        ) {
          try {
            this.socket.send(
              JSON.stringify({
                forget_all: "ticks",
              })
            );
          } catch (error) {
            console.error(
              "[Deriv] Failed to forget ticks:",
              error
            );
          }
        }

        this.socket.close();
      } catch (error) {
        console.error(
          "[Deriv] Disconnect error:",
          error
        );
      }

      this.socket =
        null;
    }

    this.notifyStatus(
      "disconnected"
    );
  }

  /**
   * Return the analysis engine.
   */
  getEngine() {
    return this.engine;
  }

  /**
   * Return whether the WebSocket
   * is currently connected.
   */
  isConnected(): boolean {
    return (
      this.socket !== null &&
      this.socket.readyState ===
        WebSocket.OPEN
    );
  }

  /**
   * Return the currently selected
   * market symbol.
   */
  getCurrentSymbol():
    | string
    | null {
    return this.currentSymbol;
  }
}
