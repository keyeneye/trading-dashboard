import { For, Show } from "solid-js";
import { positions, latestPrices } from "@app/services/trading";

export default function PositionsTable() {
  return (
    <div class="card">
      <h2>Open Positions</h2>
      <Show when={positions()} fallback={<p>Loading...</p>}>
        {(pos) => (
          <table>
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Qty</th>
                <th>Entry</th>
                <th>Current</th>
                <th>P&L</th>
              </tr>
            </thead>
            <tbody>
              <For each={pos()}>
                {(p) => {
                  const live = () => latestPrices[p.symbol] ?? p.current_price;
                  const pnl = () => (live() - p.avg_entry_price) * p.quantity;
                  return (
                    <tr>
                      <td class="symbol">{p.symbol}</td>
                      <td>{p.quantity}</td>
                      <td>${p.avg_entry_price.toFixed(2)}</td>
                      <td>${live().toFixed(2)}</td>
                      <td class={pnl() >= 0 ? "positive" : "negative"}>
                        {pnl() >= 0 ? "+" : ""}${pnl().toFixed(2)}
                      </td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>
        )}
      </Show>
    </div>
  );
}
