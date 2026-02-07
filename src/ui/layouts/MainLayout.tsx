import type { ParentProps } from "solid-js";
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
        <a href="/">Portfolio</a>
        <a href="/trades">Trades</a>
        <a href="/signals">Signals</a>
      </nav>
      <main class="main">{props.children}</main>
    </div>
  );
}
