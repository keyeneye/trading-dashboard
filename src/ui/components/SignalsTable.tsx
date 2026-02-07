import { For, Show, createResource } from "solid-js";
import { api } from "@app/services/trading";

export default function SignalsTable() {
  const [signals] = createResource(() => api.getSignals(undefined, 100));

  return (
    <div class="card">
      <h2>Recent Signals</h2>
      <Show when={signals()} fallback={<p>Loading...</p>}>
        {(list) => (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Strategy</th>
                <th>Symbol</th>
                <th>Action</th>
                <th>Strength</th>
                <th>Executed</th>
              </tr>
            </thead>
            <tbody>
              <For each={list()}>
                {(s) => (
                  <tr>
                    <td>{new Date(s.timestamp).toLocaleString()}</td>
                    <td>{s.strategy}</td>
                    <td class="symbol">{s.symbol}</td>
                    <td class={s.action === "buy" ? "positive" : s.action === "sell" ? "negative" : ""}>
                      {s.action.toUpperCase()}
                    </td>
                    <td>{(s.strength * 100).toFixed(0)}%</td>
                    <td>{s.executed ? "Yes" : "No"}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        )}
      </Show>
    </div>
  );
}
