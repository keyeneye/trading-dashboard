import { onMount, onCleanup, createEffect, createSignal, Show } from "solid-js";
import { snapshots, tradesToday, signalsToday } from "@app/services/trading";
import type { PortfolioSnapshot } from "@core/entities";

interface FibLevel {
  ratio: number;
  label: string;
  color: string;
  importance: "primary" | "secondary";
}

const FIB_LEVELS: FibLevel[] = [
  { ratio: 0,     label: "0%",     color: "rgba(0,255,157,0.6)",   importance: "secondary" },
  { ratio: 0.236, label: "23.6%",  color: "rgba(0,255,157,0.35)",  importance: "secondary" },
  { ratio: 0.382, label: "38.2%",  color: "rgba(255,214,0,0.55)",  importance: "primary" },
  { ratio: 0.5,   label: "50%",    color: "rgba(255,145,0,0.55)",  importance: "primary" },
  { ratio: 0.618, label: "61.8%",  color: "rgba(255,82,82,0.55)",  importance: "primary" },
  { ratio: 0.786, label: "78.6%",  color: "rgba(255,41,105,0.4)",  importance: "secondary" },
  { ratio: 1,     label: "100%",   color: "rgba(255,41,105,0.6)",  importance: "secondary" },
];

function drawFibonacciChart(
  canvas: HTMLCanvasElement,
  data: PortfolioSnapshot[],
  trades: any[] | undefined,
  signals: any[] | undefined,
  mouseX: number | null
) {
  const ctx = canvas.getContext("2d");
  if (!ctx || data.length < 2) return;

  const sorted = [...data].reverse();
  const values = sorted.map((s) => s.total_value);
  const timestamps = sorted.map((s) => s.timestamp);
  const labels = sorted.map((s) => s.timestamp.slice(0, 10));

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = { top: 28, right: 90, bottom: 48, left: 80 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  // Swing high/low for Fibonacci
  const swingHigh = Math.max(...values);
  const swingLow = Math.min(...values);
  const swingRange = swingHigh - swingLow || 1;

  // Display range with padding
  const displayMin = swingLow - swingRange * 0.08;
  const displayMax = swingHigh + swingRange * 0.08;
  const displayRange = displayMax - displayMin;

  const xStep = plotW / (values.length - 1);
  const toX = (i: number) => pad.left + i * xStep;
  const toY = (v: number) => pad.top + plotH - ((v - displayMin) / displayRange) * plotH;

  // === BACKGROUND ===
  const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0, "#0a0e17");
  bgGrad.addColorStop(0.5, "#0d1220");
  bgGrad.addColorStop(1, "#080c14");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Subtle scan lines
  ctx.fillStyle = "rgba(255,255,255,0.008)";
  for (let y = 0; y < h; y += 2) {
    ctx.fillRect(0, y, w, 1);
  }

  // === FIBONACCI RETRACEMENT BANDS ===
  for (let i = 0; i < FIB_LEVELS.length - 1; i++) {
    const levelTop = swingHigh - FIB_LEVELS[i].ratio * swingRange;
    const levelBot = swingHigh - FIB_LEVELS[i + 1].ratio * swingRange;
    const y1 = toY(levelTop);
    const y2 = toY(levelBot);

    // Band fill
    const bandGrad = ctx.createLinearGradient(0, y1, 0, y2);
    const alpha = i < 2 ? 0.04 : i < 4 ? 0.06 : 0.04;
    bandGrad.addColorStop(0, `rgba(255,255,255,${alpha})`);
    bandGrad.addColorStop(1, `rgba(255,255,255,${alpha * 0.3})`);
    ctx.fillStyle = bandGrad;
    ctx.fillRect(pad.left, y1, plotW, y2 - y1);
  }

  // Fibonacci level lines
  for (const level of FIB_LEVELS) {
    const price = swingHigh - level.ratio * swingRange;
    const y = toY(price);

    ctx.beginPath();
    ctx.setLineDash(level.importance === "primary" ? [8, 4] : [3, 6]);
    ctx.strokeStyle = level.color;
    ctx.lineWidth = level.importance === "primary" ? 1.2 : 0.7;
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Level label on right
    ctx.font = level.importance === "primary"
      ? "bold 10px 'JetBrains Mono', 'Fira Code', monospace"
      : "9px 'JetBrains Mono', 'Fira Code', monospace";
    ctx.fillStyle = level.color;
    ctx.textAlign = "left";
    ctx.fillText(level.label, w - pad.right + 6, y + 3);

    // Price label
    ctx.font = "9px 'JetBrains Mono', 'Fira Code', monospace";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillText(`$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, w - pad.right + 6, y + 14);
  }

  // === GRID ===
  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 0.5;
  const gridCountV = 8;
  for (let i = 0; i <= gridCountV; i++) {
    const x = pad.left + (plotW / gridCountV) * i;
    ctx.beginPath();
    ctx.moveTo(x, pad.top);
    ctx.lineTo(x, pad.top + plotH);
    ctx.stroke();
  }

  // === AREA FILL UNDER CURVE ===
  const areaGrad = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
  const lastVal = values[values.length - 1];
  const firstVal = values[0];
  const isUp = lastVal >= firstVal;

  if (isUp) {
    areaGrad.addColorStop(0, "rgba(0,255,157,0.15)");
    areaGrad.addColorStop(0.6, "rgba(0,255,157,0.04)");
    areaGrad.addColorStop(1, "rgba(0,255,157,0.0)");
  } else {
    areaGrad.addColorStop(0, "rgba(255,41,105,0.12)");
    areaGrad.addColorStop(0.6, "rgba(255,41,105,0.03)");
    areaGrad.addColorStop(1, "rgba(255,41,105,0.0)");
  }

  ctx.beginPath();
  ctx.moveTo(toX(0), toY(values[0]));
  for (let i = 1; i < values.length; i++) {
    // Smooth curve using bezier
    const prevX = toX(i - 1);
    const currX = toX(i);
    const cpx = (prevX + currX) / 2;
    ctx.bezierCurveTo(cpx, toY(values[i - 1]), cpx, toY(values[i]), currX, toY(values[i]));
  }
  ctx.lineTo(toX(values.length - 1), pad.top + plotH);
  ctx.lineTo(toX(0), pad.top + plotH);
  ctx.closePath();
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // === EQUITY LINE ===
  ctx.beginPath();
  ctx.moveTo(toX(0), toY(values[0]));
  for (let i = 1; i < values.length; i++) {
    const prevX = toX(i - 1);
    const currX = toX(i);
    const cpx = (prevX + currX) / 2;
    ctx.bezierCurveTo(cpx, toY(values[i - 1]), cpx, toY(values[i]), currX, toY(values[i]));
  }

  const lineGrad = ctx.createLinearGradient(pad.left, 0, w - pad.right, 0);
  if (isUp) {
    lineGrad.addColorStop(0, "#00ff9d");
    lineGrad.addColorStop(0.5, "#00e5ff");
    lineGrad.addColorStop(1, "#00ff9d");
  } else {
    lineGrad.addColorStop(0, "#ff2969");
    lineGrad.addColorStop(0.5, "#ff6b35");
    lineGrad.addColorStop(1, "#ff2969");
  }
  ctx.strokeStyle = lineGrad;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = isUp ? "rgba(0,255,157,0.4)" : "rgba(255,41,105,0.4)";
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // === TRADE MARKERS ===
  if (trades && trades.length > 0) {
    const tradesByDate = new Map<string, any[]>();
    for (const t of trades) {
      const dateKey = t.timestamp.slice(0, 10);
      if (!tradesByDate.has(dateKey)) tradesByDate.set(dateKey, []);
      tradesByDate.get(dateKey)!.push(t);
    }

    for (let i = 0; i < sorted.length; i++) {
      const dateKey = sorted[i].timestamp.slice(0, 10);
      const dayTrades = tradesByDate.get(dateKey);
      if (!dayTrades) continue;

      for (const trade of dayTrades) {
        const cx = toX(i);
        const cy = toY(values[i]);
        const isBuy = trade.side === "buy";

        // Marker glow
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fillStyle = isBuy ? "rgba(0,255,157,0.15)" : "rgba(255,41,105,0.15)";
        ctx.fill();

        // Marker
        ctx.beginPath();
        if (isBuy) {
          // Triangle up
          ctx.moveTo(cx, cy - 5);
          ctx.lineTo(cx - 4, cy + 3);
          ctx.lineTo(cx + 4, cy + 3);
        } else {
          // Triangle down
          ctx.moveTo(cx, cy + 5);
          ctx.lineTo(cx - 4, cy - 3);
          ctx.lineTo(cx + 4, cy - 3);
        }
        ctx.closePath();
        ctx.fillStyle = isBuy ? "#00ff9d" : "#ff2969";
        ctx.fill();
      }
    }
  }

  // === SIGNAL STRENGTH BARS (bottom) ===
  if (signals && signals.length > 0) {
    const signalsByDate = new Map<string, any[]>();
    for (const s of signals) {
      const dateKey = s.timestamp.slice(0, 10);
      if (!signalsByDate.has(dateKey)) signalsByDate.set(dateKey, []);
      signalsByDate.get(dateKey)!.push(s);
    }

    const barH = 18;
    const barY = pad.top + plotH + 4;

    for (let i = 0; i < sorted.length; i++) {
      const dateKey = sorted[i].timestamp.slice(0, 10);
      const daySignals = signalsByDate.get(dateKey);
      if (!daySignals) continue;

      const avgStrength = daySignals.reduce((s, sig) => s + sig.strength, 0) / daySignals.length;
      const isBuy = daySignals[0].action === "buy";
      const barWidth = Math.max(xStep * 0.6, 3);
      const cx = toX(i);

      ctx.fillStyle = isBuy
        ? `rgba(0,255,157,${0.2 + avgStrength * 0.5})`
        : `rgba(255,41,105,${0.2 + avgStrength * 0.5})`;
      ctx.fillRect(cx - barWidth / 2, barY + barH * (1 - avgStrength), barWidth, barH * avgStrength);
    }
  }

  // === X-AXIS LABELS ===
  ctx.font = "9px 'JetBrains Mono', 'Fira Code', monospace";
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.textAlign = "center";
  const labelStep = Math.max(1, Math.floor(labels.length / 8));
  for (let i = 0; i < labels.length; i += labelStep) {
    ctx.fillText(labels[i], toX(i), h - 6);
  }

  // === Y-AXIS LABELS ===
  ctx.font = "9px 'JetBrains Mono', 'Fira Code', monospace";
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.textAlign = "right";
  const yGridCount = 6;
  for (let i = 0; i <= yGridCount; i++) {
    const val = displayMin + (displayRange / yGridCount) * (yGridCount - i);
    const y = pad.top + (plotH / yGridCount) * i;
    ctx.fillText(`$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, pad.left - 8, y + 3);
  }

  // === CROSSHAIR & TOOLTIP ===
  if (mouseX !== null && mouseX >= pad.left && mouseX <= w - pad.right) {
    const idx = Math.round((mouseX - pad.left) / xStep);
    const clampedIdx = Math.max(0, Math.min(values.length - 1, idx));
    const cx = toX(clampedIdx);
    const cy = toY(values[clampedIdx]);

    // Vertical line
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([3, 3]);
    ctx.moveTo(cx, pad.top);
    ctx.lineTo(cx, pad.top + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Horizontal line
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.setLineDash([3, 3]);
    ctx.moveTo(pad.left, cy);
    ctx.lineTo(w - pad.right, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Crosshair dot
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = isUp ? "#00ff9d" : "#ff2969";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.strokeStyle = isUp ? "rgba(0,255,157,0.4)" : "rgba(255,41,105,0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Tooltip box
    const val = values[clampedIdx];
    const date = timestamps[clampedIdx].slice(0, 10);
    const change = clampedIdx > 0 ? val - values[clampedIdx - 1] : 0;
    const changePct = clampedIdx > 0 ? (change / values[clampedIdx - 1]) * 100 : 0;

    // Find closest Fibonacci level
    const fibPct = ((swingHigh - val) / swingRange) * 100;
    let closestFib = FIB_LEVELS[0];
    let minDist = Infinity;
    for (const level of FIB_LEVELS) {
      const dist = Math.abs(level.ratio * 100 - fibPct);
      if (dist < minDist) { minDist = dist; closestFib = level; }
    }

    const tooltipW = 185;
    const tooltipH = 72;
    const tooltipX = cx + 15 > w - pad.right - tooltipW ? cx - tooltipW - 15 : cx + 15;
    const tooltipY = Math.max(pad.top, cy - tooltipH / 2);

    // Box background
    ctx.fillStyle = "rgba(10,14,23,0.92)";
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tooltipX, tooltipY, tooltipW, tooltipH, 6);
    ctx.fill();
    ctx.stroke();

    // Tooltip content
    ctx.font = "bold 11px 'JetBrains Mono', 'Fira Code', monospace";
    ctx.fillStyle = "#e1e8f0";
    ctx.textAlign = "left";
    ctx.fillText(`$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, tooltipX + 10, tooltipY + 18);

    ctx.font = "9px 'JetBrains Mono', 'Fira Code', monospace";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText(date, tooltipX + 10, tooltipY + 33);

    ctx.fillStyle = change >= 0 ? "#00ff9d" : "#ff2969";
    ctx.fillText(
      `${change >= 0 ? "+" : ""}$${change.toLocaleString(undefined, { maximumFractionDigits: 0 })} (${changePct.toFixed(2)}%)`,
      tooltipX + 10, tooltipY + 48
    );

    ctx.fillStyle = closestFib.color;
    ctx.fillText(`Fib ${closestFib.label}`, tooltipX + 10, tooltipY + 63);
  }

  // === CURRENT VALUE TAG ===
  const currentVal = values[values.length - 1];
  const currentY = toY(currentVal);

  ctx.fillStyle = isUp ? "#00ff9d" : "#ff2969";
  ctx.beginPath();
  ctx.roundRect(w - pad.right + 2, currentY - 10, pad.right - 4, 20, 3);
  ctx.fill();

  ctx.font = "bold 10px 'JetBrains Mono', 'Fira Code', monospace";
  ctx.fillStyle = "#0a0e17";
  ctx.textAlign = "center";
  ctx.fillText(
    `$${currentVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    w - pad.right + pad.right / 2,
    currentY + 4
  );

  // === CHART TITLE OVERLAY ===
  ctx.font = "bold 11px 'JetBrains Mono', 'Fira Code', monospace";
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.textAlign = "left";
  ctx.fillText("EQUITY / FIBONACCI RETRACEMENT", pad.left + 6, pad.top - 10);

  // Period & performance
  const totalChange = ((currentVal - firstVal) / firstVal) * 100;
  ctx.font = "9px 'JetBrains Mono', 'Fira Code', monospace";
  ctx.fillStyle = totalChange >= 0 ? "rgba(0,255,157,0.5)" : "rgba(255,41,105,0.5)";
  ctx.textAlign = "right";
  ctx.fillText(
    `${totalChange >= 0 ? "+" : ""}${totalChange.toFixed(2)}% (${sorted.length}d)`,
    w - pad.right, pad.top - 10
  );
}

export default function FibonacciChart() {
  let canvasRef!: HTMLCanvasElement;
  let containerRef!: HTMLDivElement;
  let resizeObserver: ResizeObserver | undefined;
  const [mouseX, setMouseX] = createSignal<number | null>(null);

  function redraw() {
    const data = snapshots();
    if (data && data.length >= 2) {
      drawFibonacciChart(canvasRef, data, tradesToday(), signalsToday(), mouseX());
    }
  }

  onMount(() => {
    resizeObserver = new ResizeObserver(() => redraw());
    resizeObserver.observe(containerRef);
  });

  onCleanup(() => resizeObserver?.disconnect());

  createEffect(() => {
    // Track all reactive deps
    snapshots();
    tradesToday();
    signalsToday();
    mouseX();
    redraw();
  });

  function handleMouseMove(e: MouseEvent) {
    const rect = canvasRef.getBoundingClientRect();
    setMouseX(e.clientX - rect.left);
  }

  function handleMouseLeave() {
    setMouseX(null);
  }

  return (
    <div class="fib-chart-container" ref={containerRef}>
      <div class="fib-chart-header">
        <div class="fib-chart-title">
          <span class="fib-icon">&#9672;</span>
          Fibonacci Projection
        </div>
        <div class="fib-chart-legend">
          <span class="fib-legend-item fib-legend-38">38.2%</span>
          <span class="fib-legend-item fib-legend-50">50.0%</span>
          <span class="fib-legend-item fib-legend-61">61.8%</span>
          <span class="fib-legend-sep">|</span>
          <span class="fib-legend-buy">&#9650; Buy</span>
          <span class="fib-legend-sell">&#9660; Sell</span>
        </div>
      </div>
      <Show
        when={snapshots() && snapshots()!.length >= 2}
        fallback={
          <div class="fib-chart-empty">
            <div class="fib-chart-empty-icon">&#8967;</div>
            <p>Awaiting portfolio data...</p>
            <span>Minimum 2 snapshots required</span>
          </div>
        }
      >
        <canvas
          ref={canvasRef}
          style="width: 100%; height: 380px; cursor: crosshair; border-radius: 0 0 0.5rem 0.5rem;"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      </Show>
    </div>
  );
}
