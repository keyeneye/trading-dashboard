import type { IWebSocketPort, WsEvent, WsEventHandler } from "@core/ports";

export class WebSocketClient implements IWebSocketPort {
  private ws: WebSocket | null = null;
  private handlers: WsEventHandler[] = [];
  private connectHandlers: (() => void)[] = [];
  private url: string;
  private reconnectMs = 3000;
  private shouldReconnect = true;

  constructor(url?: string) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    this.url = url || `${protocol}//${window.location.host}/ws`;
  }

  connect(): void {
    this.shouldReconnect = true;
    this.doConnect();
  }

  private doConnect(): void {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("[WS] connected");
      for (const h of this.connectHandlers) h();
    };

    this.ws.onmessage = (msg) => {
      try {
        const event: WsEvent = JSON.parse(msg.data);
        for (const h of this.handlers) h(event);
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      console.log("[WS] disconnected");
      if (this.shouldReconnect) {
        setTimeout(() => this.doConnect(), this.reconnectMs);
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.ws?.close();
    this.ws = null;
  }

  onEvent(handler: WsEventHandler): void {
    this.handlers.push(handler);
  }

  onConnect(handler: () => void): void {
    this.connectHandlers.push(handler);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
