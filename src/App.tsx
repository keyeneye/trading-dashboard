import { Router, Route } from "@solidjs/router";
import { onMount } from "solid-js";
import { initTrading } from "@app/services/trading";
import MainLayout from "@ui/layouts/MainLayout";
import Dashboard from "@ui/pages/Dashboard";
import TradesPage from "@ui/pages/TradesPage";
import SignalsPage from "@ui/pages/SignalsPage";

export default function App() {
  onMount(() => initTrading());

  return (
    <Router root={MainLayout}>
      <Route path="/" component={Dashboard} />
      <Route path="/trades" component={TradesPage} />
      <Route path="/signals" component={SignalsPage} />
    </Router>
  );
}
