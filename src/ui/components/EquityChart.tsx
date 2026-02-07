import { onMount, onCleanup, createEffect, Show } from "solid-js";
import { snapshots } from "@app/services/trading";
import type { PortfolioSnapshot } from "@core/entities";

function drawChart(canvas: HTMLCanvasElement, data: PortfolioSnapshot[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx || data.length < 2) return;

  // Sort chronologically (API returns DESC)
  const sorted = [...data].reverse();
  const values = sorted.map((s) => s.total_value);
  const labels = sorted.map((s) => s.timestamp.slice(0, 10));

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;
  const pad = { top: 20, right: 16, bottom: 40, left: 70 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const minV = Math.min(...values) * 0.998;
  const maxV = Math.max(...values) * 1.002;
  const rangeV = maxV - minV || 1;

  const xStep = plotW / (values.length - 1);
  const toX = (i: number) => pad.left + i * xStep;
  const toY = (v: number) => pad.top + plotH - ((v - minV) / rangeV) * plotH;

  // Background
  ctx.fillStyle = "#1a1d27";
  ctx.fillRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = "#2a2d3a";
  ctx.lineWidth = 0.5;
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = pad.top + (plotH / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();

    // Y-axis labels
    const val = maxV - (rangeV / gridLines) * i;
    ctx.fillStyle = "#8b8fa3";
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, pad.left - 8, y + 4);
  }

  // Gradient fill
  const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
  gradient.addColorStop(0, "rgba(33, 150, 243, 0.25)");
  gradient.addColorStop(1, "rgba(33, 150, 243, 0.0)");

  ctx.beginPath();
  ctx.moveTo(toX(0), toY(values[0]));
  for (let i = 1; i < values.length; i++) {
    ctx.lineTo(toX(i), toY(values[i]));
  }
  ctx.lineTo(toX(values.length - 1), pad.top + plotH);
  ctx.lineTo(toX(0), pad.top + plotH);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Line
  const lastVal = values[values.length - 1];
  const firstVal = values[0];
  const lineColor = lastVal >= firstVal ? "#00c853" : "#ff1744";

  ctx.beginPath();
  ctx.moveTo(toX(0), toY(values[0]));
  for (let i = 1; i < values.length; i++) {
    ctx.lineTo(toX(i), toY(values[i]));
  }
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 2;
  ctx.stroke();

  // X-axis labels (show ~6 evenly spaced)
  ctx.fillStyle = "#8b8fa3";
  ctx.font = "10px Inter, sans-serif";
  ctx.textAlign = "center";
  const labelStep = Math.max(1, Math.floor(labels.length / 6));
  for (let i = 0; i < labels.length; i += labelStep) {
    ctx.fillText(labels[i], toX(i), h - 10);
  }

  // Current value label
  ctx.fillStyle = lineColor;
  ctx.font = "bold 13px Inter, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(
    `$${lastVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
    w - pad.right,
    toY(lastVal) - 8
  );
}

export default function EquityChart() {
  let canvasRef!: HTMLCanvasElement;
  let resizeObserver: ResizeObserver | undefined;

  onMount(() => {
    resizeObserver = new ResizeObserver(() => {
      const data = snapshots();
      if (data && data.length >= 2) drawChart(canvasRef, data);
    });
    resizeObserver.observe(canvasRef);
  });

  onCleanup(() => resizeObserver?.disconnect());

  createEffect(() => {
    const data = snapshots();
    if (data && data.length >= 2) drawChart(canvasRef, data);
  });

  return (
    <div class="card">
      <h2>Equity Curve</h2>
      <Show
        when={snapshots() && snapshots()!.length >= 2}
        fallback={<p style="color: var(--text-dim)">Waiting for portfolio data (need at least 2 snapshots)...</p>}
      >
        <canvas
          ref={canvasRef}
          style="width: 100%; height: 250px; border-radius: 0.5rem;"
        />
      </Show>
    </div>
  );
}
