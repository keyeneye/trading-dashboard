import { Show, createMemo } from "solid-js";
import { portfolio, positions, latestPrices } from "@app/services/trading";

export default function PortfolioSummary() {
  return (
    <Show when={portfolio()} fallback={<p>Loading portfolio...</p>}>
      {(p) => {
        const snap = () => p().snapshot;
        const livePositionsValue = createMemo(() => {
          const pos = positions();
          if (!pos || pos.length === 0) return null;
          return pos.reduce((sum, p) => sum + p.quantity * (latestPrices[p.symbol] ?? p.current_price), 0);
        });
        const liveTotalValue = () => {
          const posVal = livePositionsValue();
          const s = snap();
          if (posVal === null || !s) return s?.total_value ?? 0;
          return s.cash + posVal;
        };
        const liveDailyPnl = () => {
          const s = snap();
          if (!s) return 0;
          return liveTotalValue() - s.total_value + s.daily_pnl;
        };
        return (
          <div class="card portfolio-summary">
            <h2>Portfolio</h2>
            <Show when={snap()}>
              {(s) => (
                <div class="stats">
                  <div class="stat">
                    <span class="label">Total Value</span>
                    <span class="value">${liveTotalValue().toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div class="stat">
                    <span class="label">Cash</span>
                    <span class="value">${s().cash.toLocaleString()}</span>
                  </div>
                  <div class="stat">
                    <span class="label">Positions</span>
                    <span class="value">${(livePositionsValue() ?? s().positions_value).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div class="stat">
                    <span class="label">Daily P&L</span>
                    <span class={`value ${liveDailyPnl() >= 0 ? "positive" : "negative"}`}>
                      {liveDailyPnl() >= 0 ? "+" : ""}${liveDailyPnl().toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
