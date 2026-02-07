import type { IApiPort } from "@core/ports";
import type { Portfolio, Trade, Signal, Position, PortfolioSnapshot } from "@core/entities";

const BASE = import.meta.env.VITE_API_URL || "";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}: ${path}`);
  return res.json();
}

export class ApiClient implements IApiPort {
  getPortfolio(): Promise<Portfolio> {
    return get("/api/portfolio");
  }

  getPositions(): Promise<Position[]> {
    return get("/api/positions");
  }

  getTrades(symbol?: string, limit = 50): Promise<Trade[]> {
    const params = new URLSearchParams();
    if (symbol) params.set("symbol", symbol);
    params.set("limit", String(limit));
    return get(`/api/trades?${params}`);
  }

  getTradesToday(): Promise<Trade[]> {
    return get("/api/trades/today");
  }

  getSignals(symbol?: string, limit = 100): Promise<Signal[]> {
    const params = new URLSearchParams();
    if (symbol) params.set("symbol", symbol);
    params.set("limit", String(limit));
    return get(`/api/signals?${params}`);
  }

  getSignalsToday(): Promise<Signal[]> {
    return get("/api/signals/today");
  }

  getSnapshots(limit = 30): Promise<PortfolioSnapshot[]> {
    return get(`/api/snapshots?limit=${limit}`);
  }
}
