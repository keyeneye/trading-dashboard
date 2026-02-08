import type { ParentProps } from "solid-js";
import { ErrorBoundary, createSignal } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import { connected } from "@app/services/trading";

export default function MainLayout(props: ParentProps) {
  const [menuOpen, setMenuOpen] = createSignal(false);
  const location = useLocation();

  const closeMenu = () => setMenuOpen(false);

  return (
    <div class="app">
      <div class="sticky-header">
        <header class="header">
          <h1>AutoTrader Dashboard</h1>
          <div class="header-right">
            <span class={`status ${connected() ? "online" : "offline"}`}>
              {connected() ? "LIVE" : "OFFLINE"}
            </span>
            <button
              class={`burger ${menuOpen() ? "open" : ""}`}
              onClick={() => setMenuOpen(!menuOpen())}
              aria-label="Toggle menu"
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </header>
        <nav class={`nav ${menuOpen() ? "nav-open" : ""}`}>
          <A href="/" end onClick={closeMenu}>Portfolio</A>
          <A href="/trades" onClick={closeMenu}>Trades</A>
          <A href="/signals" onClick={closeMenu}>Signals</A>
        </nav>
      </div>
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
      <div
        class={`nav-overlay ${menuOpen() ? "visible" : ""}`}
        onClick={closeMenu}
      />
    </div>
  );
}
