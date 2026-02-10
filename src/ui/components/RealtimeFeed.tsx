import { For, createMemo } from "solid-js";
import { realtimeSignals, realtimeTrades, signalsToday, tradesToday } from "@app/services/trading";

export default function RealtimeFeed() {
  const feedItems = createMemo(() => {
    // Merge real-time WS events with today's REST data, newest first
    const rtTrades = [...realtimeTrades];
    const rtSignals = [...realtimeSignals];
    const restTrades = (tradesToday() ?? []).map((t: any) => ({ ...t, side: t.side }));
    const restSignals = (signalsToday() ?? []).map((s: any) => ({ ...s, action: s.action }));

    // Deduplicate: if a rest item's timestamp+symbol matches a real-time item, skip it
    const rtKeys = new Set([
      ...rtTrades.map((t: any) => `${t.symbol}-${t.timestamp}`),
      ...rtSignals.map((s: any) => `${s.symbol}-${s.timestamp}`),
    ]);

    const dedupedRestTrades = restTrades.filter((t: any) => !rtKeys.has(`${t.symbol}-${t.timestamp}`));
    const dedupedRestSignals = restSignals.filter((s: any) => !rtKeys.has(`${s.symbol}-${s.timestamp}`));

    const all = [...rtTrades, ...rtSignals, ...dedupedRestTrades, ...dedupedRestSignals];
    all.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return all.slice(0, 30);
  });

  return (
    <div class="card realtime-feed">
      <h2>Live Feed</h2>
      <div class="feed-list">
        <For each={feedItems()}>
          {(item) => {
            const isTrade = "side" in item;
            return (
              <div class={`feed-item ${isTrade ? "trade" : "signal"}`}>
                <span class="time">{new Date(item.timestamp).toLocaleTimeString()}</span>
                <span class="symbol">{item.symbol}</span>
                <span class={`action ${
                  (isTrade ? (item as any).side : (item as any).action) === "buy" ? "positive" : "negative"
                }`}>
                  {isTrade ? `${(item as any).side.toUpperCase()} ${(item as any).quantity}` : (item as any).action.toUpperCase()}
                </span>
                <span class="detail">
                  {isTrade ? `@ $${(item as any).price.toFixed(2)}` : (item as any).strategy}
                </span>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}
