import type { ParentProps } from "solid-js";
import { ErrorBoundary } from "solid-js";
import { A } from "@solidjs/router";
import { connected } from "@app/services/trading";

export default function MainLayout(props: ParentProps) {
  return (
    <div class="app">
      <header class="header">
        <h1>AutoTrader Dashboard</h1>
        <span class={`status ${connected() ? "online" : "offline"}`}>
          {connected() ? "LIVE" : "OFFLINE"}
        </span>
      </header>
      <nav class="nav">
        <A href="/" end>Portfolio</A>
        <A href="/trades">Trades</A>
        <A href="/signals">Signals</A>
      </nav>
      <main class="main">
        <ErrorBoundary fallback={(err, reset) => (
          <div class="card">
            <h2>Connection Error</h2>
            <p>{err.message}</p>
            <button onClick={reset}>Retry</button>
          </div>
        )}>
          {props.children}
        </ErrorBoundary>
      </main>
    </div>
  );
}
