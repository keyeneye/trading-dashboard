import { For, Show } from "solid-js";
import { positions, latestPrices } from "@app/services/trading";
import { isShortPosition, calculatePositionPnL } from "@core/entities/position";

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
                <th>Type</th>
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
                  const pnl = () => calculatePositionPnL(p);
                  const short = () => isShortPosition(p);
                  const pnlClass = () => {
                    if (short()) {
                      return pnl() >= 0 ? "positive" : "negative";
                    }
                    return pnl() >= 0 ? "positive" : "negative";
                  };
                  return (
                    <tr>
                      <td class="symbol">{p.symbol}</td>
                      <td>
                        <span class={`badge ${short() ? "badge-short" : "badge-long"}`}>
                          {short() ? "SHORT" : "LONG"}
                        </span>
                      </td>
                      <td>{p.quantity}</td>
                      <td>${p.avg_entry_price.toFixed(2)}</td>
                      <td>${live().toFixed(2)}</td>
                      <td class={pnlClass()}>
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
