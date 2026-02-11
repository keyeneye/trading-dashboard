import { onMount, onCleanup, createEffect, createSignal, createMemo, createResource, Show, For } from "solid-js";
import { tradesToday, signalsToday, portfolio, latestSnapshot, positions, latestPrices, api } from "@app/services/trading";
import type { PortfolioSnapshot } from "@core/entities";

type Period = "1D" | "1M" | "1Y" | "ALL";
const PERIODS: Period[] = ["1D", "1M", "1Y", "ALL"];

const PERIOD_CONFIG: Record<Period, { limit: number; daysBack: number | null }> = {
  "1D":  { limit: 50,    daysBack: 0 },
  "1M":  { limit: 100,   daysBack: 30 },
  "1Y":  { limit: 2000,  daysBack: 365 },
  "ALL": { limit: 10000, daysBack: null },
};

function filterByPeriod(data: PortfolioSnapshot[], period: Period): PortfolioSnapshot[] {
  const { daysBack } = PERIOD_CONFIG[period];
  if (daysBack === null) return data;
  if (daysBack === 0) {
    const today = new Date().toISOString().slice(0, 10);
    return data.filter((s) => s.timestamp.slice(0, 10) === today);
  }
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysBack);
  const cutoffStr = cutoff.toISOString();
  return data.filter((s) => s.timestamp >= cutoffStr);
}

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
  const pad = { top: 45, right: 90, bottom: 48, left: 80 };
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

export default function PerformanceChart() {
  let canvasRef: HTMLCanvasElement | undefined;
  let containerRef: HTMLDivElement | undefined;
  let resizeObserver: ResizeObserver | undefined;
  const [mouseX, setMouseX] = createSignal<number | null>(null);
  const [period, setPeriod] = createSignal<Period>("1M");

  // Fetch snapshots based on selected period
  const [periodSnapshots, { refetch: refetchPeriod }] = createResource(period, async (p) => {
    const { limit } = PERIOD_CONFIG[p];
    const data = await api.getSnapshots(limit);
    return filterByPeriod(data, p);
  });

  // Accumulate live portfolio samples for intraday resolution.
  // Captures a data point every 2 minutes while the page is open.
  const [intradaySamples, setIntradaySamples] = createSignal<PortfolioSnapshot[]>([]);
  const SAMPLE_INTERVAL = 2 * 60 * 1000; // 2 minutes

  // Build a live snapshot for today from current positions + prices.
  // The API snapshots may only go up to yesterday if no new snapshot
  // has been persisted yet.
  const liveSnapshot = createMemo((): PortfolioSnapshot | null => {
    const p = portfolio();
    if (!p?.snapshot) return null;

    const pos = positions();
    if (!pos || pos.length === 0) return null;

    const prices = latestPrices;
    const positionsValue = pos.reduce((sum, p) => {
      const price = prices[p.symbol] ?? p.current_price;
      return sum + p.quantity * price;
    }, 0);
    const totalValue = p.snapshot.cash + positionsValue;
    const dailyPnl = pos.reduce((sum, p) => {
      const price = prices[p.symbol] ?? p.current_price;
      return sum + (price - p.avg_entry_price) * p.quantity;
    }, 0);

    return {
      id: 0,
      timestamp: new Date().toISOString(),
      total_value: totalValue,
      cash: p.snapshot.cash,
      positions_value: positionsValue,
      daily_pnl: dailyPnl,
      total_pnl: p.snapshot.total_pnl,
    };
  });

  // Sample live portfolio periodically for intraday chart
  const sampleInterval = setInterval(() => {
    const snap = liveSnapshot();
    if (snap) {
      setIntradaySamples((prev) => [...prev, { ...snap, timestamp: new Date().toISOString() }]);
    }
  }, SAMPLE_INTERVAL);
  onCleanup(() => clearInterval(sampleInterval));

  // Refetch API snapshots when a new backend snapshot arrives via WS
  createEffect(() => {
    latestSnapshot();
    refetchPeriod();
  });

  // Merge API snapshots with live samples and current value.
  const mergedSnapshots = createMemo(() => {
    const apiData = periodSnapshots();
    const live = latestSnapshot() ?? liveSnapshot();

    if (period() === "1D") {
      // Combine: API snapshots for today + frontend samples + live value
      const today = new Date().toISOString().slice(0, 10);
      const apiToday = (apiData ?? []).filter((s) => s.timestamp.slice(0, 10) === today);
      const samples = intradaySamples();
      const all = [...apiToday, ...samples];
      if (live) all.push(live);
      // Sort chronologically and deduplicate by ~1 min proximity
      all.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      const deduped: PortfolioSnapshot[] = [];
      for (const s of all) {
        const last = deduped[deduped.length - 1];
        if (!last || Math.abs(new Date(s.timestamp).getTime() - new Date(last.timestamp).getTime()) > 60_000) {
          deduped.push(s);
        }
      }
      return deduped.length > 0 ? deduped : apiData;
    }

    if (!apiData || apiData.length === 0) {
      return live ? [live] : apiData;
    }

    if (!live) return apiData;

    const liveDate = live.timestamp.slice(0, 10);
    const newestDate = apiData[0].timestamp.slice(0, 10);

    if (liveDate === newestDate) {
      return [live, ...apiData.slice(1)];
    } else if (liveDate > newestDate) {
      return [live, ...apiData];
    }
    return apiData;
  });

  const currentValue = createMemo(() => {
    const p = portfolio();
    if (p?.snapshot) return p.snapshot.total_value;
    const s = mergedSnapshots();
    if (s && s.length > 0) return s[0].total_value;
    return null;
  });

  const totalReturn = createMemo(() => {
    const s = mergedSnapshots();
    if (!s || s.length < 2) return null;
    const sorted = [...s].reverse();
    const first = sorted[0].total_value;
    const last = sorted[sorted.length - 1].total_value;
    return ((last - first) / first) * 100;
  });

  const tradeCount = createMemo(() => tradesToday()?.length ?? 0);

  const snapshotPeriod = createMemo(() => mergedSnapshots()?.length ?? 0);

  function redraw() {
    const data = mergedSnapshots();
    if (data && data.length >= 2 && canvasRef) {
      drawFibonacciChart(canvasRef, data, tradesToday(), signalsToday(), mouseX());
    }
  }

  onMount(() => {
    if (containerRef) {
      resizeObserver = new ResizeObserver(() => redraw());
      resizeObserver.observe(containerRef);
    }
  });

  onCleanup(() => resizeObserver?.disconnect());

  createEffect(() => {
    mergedSnapshots();
    tradesToday();
    signalsToday();
    mouseX();
    redraw();
  });

  function handleMouseMove(e: MouseEvent) {
    if (!canvasRef) return;
    const rect = canvasRef.getBoundingClientRect();
    setMouseX(e.clientX - rect.left);
  }

  function handleMouseLeave() {
    setMouseX(null);
  }

  return (
    <div class="card fib-chart-container performance-card" ref={containerRef!}>
      <div class="performance-header">
        <h2>Performance Overview</h2>
        <div class="time-range-controls">
          <For each={PERIODS}>
            {(p) => (
              <button
                class={`time-range-btn${period() === p ? " active" : ""}`}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            )}
          </For>
        </div>
        <div class="performance-current">
          <span class="current-label">Current</span>
          <span class="current-value">
            {currentValue() !== null
              ? `$${currentValue()!.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
              : "—"}
          </span>
        </div>
      </div>

      <div class="performance-content">
        <div class="performance-legend">
          <div class="legend-section">
            <span class="legend-title">Fibonacci Levels</span>
            <div class="legend-items">
              <span class="fib-badge fib-38">38.2%</span>
              <span class="fib-badge fib-50">50.0%</span>
              <span class="fib-badge fib-61">61.8%</span>
            </div>
          </div>
          <div class="legend-section">
            <span class="legend-title">Trade Signals</span>
            <div class="legend-items">
              <span class="signal-badge signal-buy">▲ Buy</span>
              <span class="signal-badge signal-sell">▼ Sell</span>
            </div>
          </div>
        </div>

        <div class="chart-wrapper" style="min-height: 320px;">
          <Show
            when={mergedSnapshots() && mergedSnapshots()!.length >= 2}
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
              style="width: 100%; height: 320px; cursor: crosshair;"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            />
          </Show>
        </div>
      </div>

      <div class="performance-footer">
        <div class="footer-stat">
          <span class="footer-label">Period</span>
          <span class="footer-value">{snapshotPeriod()} Days</span>
        </div>
        <div class="footer-divider" />
        <div class="footer-stat">
          <span class="footer-label">Total Return</span>
          <span class={`footer-value ${totalReturn() !== null && totalReturn()! >= 0 ? "positive" : "negative"}`}>
            {totalReturn() !== null
              ? `${totalReturn()! >= 0 ? "+" : ""}${totalReturn()!.toFixed(2)}%`
              : "—"}
          </span>
        </div>
        <div class="footer-divider" />
        <div class="footer-stat">
          <span class="footer-label">Trades Today</span>
          <span class="footer-value">{tradeCount()}</span>
        </div>
      </div>
    </div>
  );
}

