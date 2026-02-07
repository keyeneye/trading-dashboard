import { createSignal, createResource, onCleanup } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import type { Trade, Signal, Position, PortfolioSnapshot } from "@core/entities";
import type { WsEvent } from "@core/ports";
import { ApiClient } from "@infra/api/client";
import { WebSocketClient } from "@infra/ws/client";

const api = new ApiClient();
const ws = new WebSocketClient();

// --- Reactive state ---

const [connected, setConnected] = createSignal(false);
const [realtimeSignals, setRealtimeSignals] = createStore<Signal[]>([]);
const [realtimeTrades, setRealtimeTrades] = createStore<Trade[]>([]);
const [latestPrices, setLatestPrices] = createStore<Record<string, number>>({});
const [latestSnapshot, setLatestSnapshot] = createSignal<PortfolioSnapshot | null>(null);

// --- Resources (auto-fetching) ---

const [positions, { refetch: refetchPositions }] = createResource(() => api.getPositions());
const [tradesToday, { refetch: refetchTrades }] = createResource(() => api.getTradesToday());
const [signalsToday, { refetch: refetchSignals }] = createResource(() => api.getSignalsToday());
const [snapshots, { refetch: refetchSnapshots }] = createResource(() => api.getSnapshots(30));
const [portfolio, { refetch: refetchPortfolio }] = createResource(() => api.getPortfolio());

// --- WebSocket event handling ---

function handleWsEvent(event: WsEvent) {
  switch (event.channel) {
    case "signal.new":
      setRealtimeSignals((prev) => [event.data as unknown as Signal, ...prev].slice(0, 50));
      refetchSignals();
      break;
    case "trade.executed":
      setRealtimeTrades((prev) => [event.data as unknown as Trade, ...prev].slice(0, 50));
      refetchTrades();
      refetchPositions();
      refetchPortfolio();
      break;
    case "price.update":
      setLatestPrices(event.data.symbol as string, event.data.price as number);
      break;
    case "portfolio.snapshot":
      setLatestSnapshot(event.data as unknown as PortfolioSnapshot);
      refetchSnapshots();
      refetchPortfolio();
      break;
  }
}

// --- Public API ---

export function initTrading() {
  ws.onEvent(handleWsEvent);
  ws.connect();

  // Track connection state
  const interval = setInterval(() => setConnected(ws.isConnected()), 2000);
  onCleanup(() => {
    clearInterval(interval);
    ws.disconnect();
  });
}

export {
  connected,
  positions,
  tradesToday,
  signalsToday,
  snapshots,
  portfolio,
  realtimeSignals,
  realtimeTrades,
  latestPrices,
  latestSnapshot,
  refetchPositions,
  refetchTrades,
  refetchSignals,
  refetchSnapshots,
  refetchPortfolio,
  api,
};
