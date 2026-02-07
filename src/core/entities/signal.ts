export interface Signal {
  id: number;
  timestamp: string;
  strategy: string;
  symbol: string;
  action: "buy" | "sell" | "hold";
  strength: number;
  reason: string;
  executed: number;
}
