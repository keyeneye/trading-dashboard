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
// Fetchers catch errors to prevent them from propagating into
// the router's Suspense transitions (which would abort navigation).
// Components already handle undefined via <Show> fallbacks.

async function safeFetch<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try { return await fn(); }
  catch (e) { console.error(e); return undefined; }
}

const [positions, { refetch: refetchPositions }] = createResource(() => safeFetch(() => api.getPositions()));
const [tradesToday, { refetch: refetchTrades }] = createResource(() => safeFetch(() => api.getTradesToday()));
const [signalsToday, { refetch: refetchSignals }] = createResource(() => safeFetch(() => api.getSignalsToday()));
const [snapshots, { refetch: refetchSnapshots }] = createResource(() => safeFetch(() => api.getSnapshots(30)));
const [portfolio, { refetch: refetchPortfolio }] = createResource(() => safeFetch(() => api.getPortfolio()));

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
      refetchPositions();
      break;
  }
}

// --- Public API ---

export function initTrading() {
  ws.onEvent(handleWsEvent);
  ws.onConnect(() => {
    refetchPositions();
    refetchTrades();
    refetchSignals();
    refetchSnapshots();
    refetchPortfolio();
  });
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
