import { Show } from "solid-js";
import { portfolio } from "@app/services/trading";

export default function PortfolioSummary() {
  return (
    <Show when={portfolio()} fallback={<p>Loading portfolio...</p>}>
      {(p) => {
        const snap = () => p().snapshot;
        return (
          <div class="card portfolio-summary">
            <h2>Portfolio</h2>
            <Show when={snap()}>
              {(s) => (
                <div class="stats">
                  <div class="stat">
                    <span class="label">Total Value</span>
                    <span class="value">${s().total_value.toLocaleString()}</span>
                  </div>
                  <div class="stat">
                    <span class="label">Cash</span>
                    <span class="value">${s().cash.toLocaleString()}</span>
                  </div>
                  <div class="stat">
                    <span class="label">Positions</span>
                    <span class="value">${s().positions_value.toLocaleString()}</span>
                  </div>
                  <div class="stat">
                    <span class="label">Daily P&L</span>
                    <span class={`value ${s().daily_pnl >= 0 ? "positive" : "negative"}`}>
                      {s().daily_pnl >= 0 ? "+" : ""}${s().daily_pnl.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </Show>
          </div>
        );
      }}
    </Show>
  );
}
