export interface WsEvent {
  channel: "signal.new" | "trade.executed" | "price.update" | "portfolio.snapshot";
  data: Record<string, unknown>;
}

export type WsEventHandler = (event: WsEvent) => void;

export interface IWebSocketPort {
  connect(): void;
  disconnect(): void;
  onEvent(handler: WsEventHandler): void;
  isConnected(): boolean;
}
