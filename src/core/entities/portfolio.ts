export interface PortfolioSnapshot {
  id: number;
  timestamp: string;
  total_value: number;
  cash: number;
  positions_value: number;
  daily_pnl: number;
  total_pnl: number;
}

export interface Portfolio {
  snapshot: PortfolioSnapshot | null;
  positions: import("./position").Position[];
}
