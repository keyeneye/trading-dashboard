import { For, Show, createResource } from "solid-js";
import { api } from "@app/services/trading";

export default function TradesTable() {
  const [trades] = createResource(() => api.getTrades(undefined, 50));

  return (
    <div class="card">
      <h2>Recent Trades</h2>
      <Show when={trades()} fallback={<p>Loading...</p>}>
        {(list) => (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Symbol</th>
                <th>Side</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Strategy</th>
              </tr>
            </thead>
            <tbody>
              <For each={list()}>
                {(t) => (
                  <tr>
                    <td>{new Date(t.timestamp).toLocaleString()}</td>
                    <td class="symbol">{t.symbol}</td>
                    <td class={t.side === "buy" ? "positive" : "negative"}>{t.side.toUpperCase()}</td>
                    <td>{t.quantity}</td>
                    <td>${t.price.toFixed(2)}</td>
                    <td>{t.strategy}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        )}
      </Show>
    </div>
  );
}
