import type { Portfolio, Trade, Signal, Position, PortfolioSnapshot } from "../entities";

export interface IApiPort {
  getPortfolio(): Promise<Portfolio>;
  getPositions(): Promise<Position[]>;
  getTrades(symbol?: string, limit?: number): Promise<Trade[]>;
  getTradesToday(): Promise<Trade[]>;
  getSignals(symbol?: string, limit?: number): Promise<Signal[]>;
  getSignalsToday(): Promise<Signal[]>;
  getSnapshots(limit?: number): Promise<PortfolioSnapshot[]>;
}
