import { For, Show } from "solid-js";
import { positions, latestPrices } from "@app/services/trading";
import { isShortPosition, calculatePositionPnL } from "@core/entities/position";

export default function PositionsTable() {
  return (
    <div class="card positions-card">
      <div class="card-header">
        <h2>Open Positions</h2>
        <span class="positions-count">{positions()?.length || 0} Active</span>
      </div>
      <Show when={positions()} fallback={<p>Loading...</p>}>
        {(pos) => {
          const totalPnl = () => pos().reduce((sum, p) => sum + calculatePositionPnL(p), 0);
          const totalValue = () => pos().reduce((sum, p) => sum + (p.quantity * (latestPrices[p.symbol] ?? p.current_price)), 0);

          return (
            <>
              <div class="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th class="col-symbol">Symbol</th>
                      <th class="col-type">Type</th>
                      <th class="col-qty">Qty</th>
                      <th class="col-entry">Entry</th>
                      <th class="col-current">Current</th>
                      <th class="col-pnl">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={pos()}>
                      {(p) => {
                        const live = () => latestPrices[p.symbol] ?? p.current_price;
                        const pnl = () => calculatePositionPnL(p);
                        const short = () => isShortPosition(p);
                        const pnlPercent = () => ((live() - p.avg_entry_price) / p.avg_entry_price) * 100;
                        return (
                          <tr>
                            <td class="symbol">{p.symbol}</td>
                            <td>
                              <span class={`badge ${short() ? "badge-short" : "badge-long"}`}>
                                {short() ? "SHORT" : "LONG"}
                              </span>
                            </td>
                            <td class="qty">{p.quantity}</td>
                            <td class="price">${p.avg_entry_price.toFixed(2)}</td>
                            <td class="price">${live().toFixed(2)}</td>
                            <td class={`pnl ${pnl() >= 0 ? "positive" : "negative"}`}>
                              <span class="pnl-value">{pnl() >= 0 ? "+" : ""}${pnl().toFixed(2)}</span>
                              <span class="pnl-pct">{pnlPercent().toFixed(2)}%</span>
                            </td>
                          </tr>
                        );
                      }}
                    </For>
                  </tbody>
                </table>
              </div>
              <div class="table-footer">
                <div class="footer-item">
                  <span class="footer-label">Total Value</span>
                  <span class="footer-value">${totalValue().toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
                <div class={`footer-item footer-item-position ${totalPnl() >= 0 ? "positive" : "negative"}`}>
                  <span class="footer-label">Total P&L</span>
                  <span class="footer-value">{totalPnl() >= 0 ? "+" : ""}${totalPnl().toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </>
          );
        }}
      </Show>
    </div>
  );
}
