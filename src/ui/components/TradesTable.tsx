import { For, Show, createResource } from "solid-js";
import { api } from "@app/services/trading";

interface Trade {
  id: number;
  timestamp: string;
  symbol: string;
  side: "buy" | "sell" | "short" | "cover";
  quantity: number;
  price: number;
  total_value: number;
  strategy: string;
  order_id: string;
  notes: string;
}

function getSideClass(side: string): string {
  switch (side) {
    case "buy":
    case "cover":
      return "positive";
    case "sell":
    case "short":
      return "negative";
    default:
      return "";
  }
}

function getSideLabel(side: string): string {
  return side.toUpperCase();
}

export default function TradesTable() {
  const [trades] = createResource(async () => {
    try { return await api.getTrades(undefined, 50); }
    catch (e) { console.error(e); return undefined; }
  });

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
                {(t: Trade) => (
                  <tr>
                    <td>{new Date(t.timestamp).toLocaleString()}</td>
                    <td class="symbol">{t.symbol}</td>
                    <td class={getSideClass(t.side)}>
                      <span class={`badge ${getSideClass(t.side)}`}>
                        {getSideLabel(t.side)}
                      </span>
                    </td>
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
