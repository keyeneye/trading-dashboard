import { For } from "solid-js";
import { realtimeSignals, realtimeTrades } from "@app/services/trading";

export default function RealtimeFeed() {
  return (
    <div class="card realtime-feed">
      <h2>Live Feed</h2>
      <div class="feed-list">
        <For each={[...realtimeTrades, ...realtimeSignals].slice(0, 20)}>
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
