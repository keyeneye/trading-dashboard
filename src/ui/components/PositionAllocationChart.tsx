import { createEffect, Show, onMount, createSignal } from "solid-js";
import { positions, portfolio } from "@app/services/trading";
import type { Position, Portfolio } from "@core/entities";

interface AllocationItem {
  symbol: string;
  value: number;
  percentage: number;
  color: string;
}

const CHART_COLORS = [
  "#00ff9d", "#00e5ff", "#9d4edd", "#ff6b6b", "#ffd166",
  "#06d6a0", "#ef476f", "#4361ee", "#f72585", "#4cc9f0"
];

export default function PositionAllocationChart() {
  let svgRef!: SVGSVGElement;
  const [hoveredItem, setHoveredItem] = createSignal<AllocationItem | null>(null);

  const getAllocationData = (pos: Position[], port: Portfolio): AllocationItem[] => {
    if (!port || !pos || pos.length === 0) return [];

    const totalValue = port.snapshot?.total_value || 0;
    const cash = port.snapshot?.cash || 0;

    const items: AllocationItem[] = [];

    pos.forEach((p, i) => {
      const value = p.quantity * p.current_price;
      items.push({
        symbol: p.symbol,
        value,
        percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
        color: CHART_COLORS[i % CHART_COLORS.length]
      });
    });

    if (cash > 0) {
      items.push({
        symbol: "CASH",
        value: cash,
        percentage: totalValue > 0 ? (cash / totalValue) * 100 : 0,
        color: "#1a1d29"
      });
    }

    return items.sort((a, b) => b.value - a.value);
  };

  const drawDonutChart = (data: AllocationItem[]) => {
    if (data.length === 0 || !svgRef) return;

    const svg = svgRef;
    svg.innerHTML = "";

    const size = 280;
    const strokeWidth = 32;
    const radius = (size - strokeWidth) / 2;
    const center = size / 2;
    const circumference = 2 * Math.PI * radius;

    let currentAngle = 0;

    data.forEach((item, index) => {
      const angle = (item.percentage / 100) * 360;
      const endAngle = currentAngle + angle;

      const startRad = (currentAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = center + radius * Math.cos(startRad);
      const y1 = center + radius * Math.sin(startRad);
      const x2 = center + radius * Math.cos(endRad);
      const y2 = center + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute(
        "d",
        `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`
      );
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", item.color);
      path.setAttribute("stroke-width", strokeWidth.toString());
      path.setAttribute("stroke-linecap", "round");
      path.style.transformOrigin = "center";
      path.style.transform = "rotate(-90deg)";
      path.style.transition = "all 0.3s ease";
      path.style.cursor = "pointer";

      path.addEventListener("mouseenter", () => {
        path.style.filter = `brightness(1.3) drop-shadow(0 0 15px ${item.color})`;
        path.setAttribute("stroke-width", (strokeWidth + 8).toString());
        setHoveredItem(item);
      });

      path.addEventListener("mouseleave", () => {
        path.style.filter = "none";
        path.setAttribute("stroke-width", strokeWidth.toString());
        setHoveredItem(null);
      });

      svg.appendChild(path);

      currentAngle = endAngle;
    });
  };

  createEffect(() => {
    const p = positions();
    const port = portfolio();
    if (p && port) {
      const data = getAllocationData(p, port);
      drawDonutChart(data);
    }
  });

  onMount(() => {
    const p = positions();
    const port = portfolio();
    if (p && port) {
      const data = getAllocationData(p, port);
      drawDonutChart(data);
    }
  });

  return (
    <Show when={positions()} fallback={<div class="card position-allocation"><p style="color: var(--text-dim)">No allocation data...</p></div>}>
      {(posData) => (
        <Show when={portfolio()} fallback={<div class="card position-allocation"><p style="color: var(--text-dim)">No allocation data...</p></div>}>
          {(portData) => {
            const data = getAllocationData(posData(), portData());
            const totalValue = portData().snapshot?.total_value || 0;
            const hovered = hoveredItem();

            return (
              <div class="card position-allocation">
                <div class="allocation-header">
                  <h2>Portfolio Allocation</h2>
                  <div class="allocation-total">
                    <span class="total-value">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    <span class="total-label">Total Value</span>
                  </div>
                </div>

                <div class="allocation-content">
                  <div class="donut-chart-container">
                    <svg
                      ref={svgRef}
                      viewBox="0 0 280 280"
                      class="donut-chart"
                    />
                    <div class={`donut-center ${hovered ? 'hovered' : ''}`}>
                      <Show when={hovered} fallback={
                        <>
                          <span class="center-value">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          <span class="center-label">Portfolio Total</span>
                        </>
                      }>
                        <span class="center-symbol">{hovered?.symbol}</span>
                        <span class="center-pct">{hovered?.percentage.toFixed(1)}%</span>
                        <span class="center-amount">${hovered?.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </Show>
                    </div>
                  </div>

                  <div class="allocation-legend">
                    {data.map((item) => (
                      <div
                        class={`allocation-item ${hoveredItem()?.symbol === item.symbol ? 'active' : ''} ${item.symbol === 'CASH' ? 'item-cash' : ''}`}
                        onMouseEnter={() => setHoveredItem(item)}
                        onMouseLeave={() => setHoveredItem(null)}
                      >
                        <div class="item-left">
                          <span class="item-color" style={{ "background-color": item.color }} />
                          <span class="item-symbol">{item.symbol}</span>
                        </div>
                        <div class="item-bar-container">
                          <div
                            class="item-bar"
                            style={{
                              width: `${item.percentage}%`,
                              "background-color": item.color
                            }}
                          />
                        </div>
                        <div class="item-right">
                          <span class="item-pct">{item.percentage.toFixed(1)}%</span>
                          <span class="item-value">${item.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div class="allocation-footer">
                  <div class="footer-item">
                    <span class="footer-label">Active Positions</span>
                    <span class="footer-value">{data.filter(i => i.symbol !== 'CASH').length}</span>
                  </div>
                  <div class="footer-divider" />
                  <div class="footer-item">
                    <span class="footer-label">Cash Allocation</span>
                    <span class="footer-value">{data.find(i => i.symbol === 'CASH')?.percentage.toFixed(1) || 0}%</span>
                  </div>
                  <div class="footer-divider" />
                  <div class="footer-item">
                    <span class="footer-label">Largest Position</span>
                    <span class="footer-value" data-value={data[0]?.symbol}>{data[0]?.symbol || '-'}</span>
                  </div>
                </div>
              </div>
            );
          }}
        </Show>
      )}
    </Show>
  );
}
