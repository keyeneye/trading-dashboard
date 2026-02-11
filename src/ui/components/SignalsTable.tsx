import { For, Show, createResource, createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { api } from "@app/services/trading";

function usePageSize(tableRef: () => HTMLElement | undefined) {
  const ROW_HEIGHT = 37;
  const OVERHEAD = 160;
  const MIN_ROWS = 5;
  const DEFAULT = 20;

  const compute = () => {
    const el = tableRef();
    if (!el) return DEFAULT;
    const available = window.innerHeight - OVERHEAD;
    const thead = el.querySelector("thead");
    const theadH = thead ? thead.offsetHeight : 32;
    const rows = Math.floor((available - theadH) / ROW_HEIGHT);
    return Math.max(MIN_ROWS, rows);
  };

  const [pageSize, setPageSize] = createSignal(DEFAULT);

  const update = () => setPageSize(compute());

  createEffect(() => {
    if (tableRef()) update();
  });

  window.addEventListener("resize", update);
  onCleanup(() => window.removeEventListener("resize", update));

  return pageSize;
}

export default function SignalsTable() {
  const [signals] = createResource(async () => {
    try { return await api.getSignals(undefined, 500); }
    catch (e) { console.error(e); return undefined; }
  });

  let tableEl: HTMLDivElement | undefined;
  const pageSize = usePageSize(() => tableEl);
  const [page, setPage] = createSignal(0);

  const totalPages = createMemo(() => {
    const list = signals();
    if (!list) return 0;
    return Math.ceil(list.length / pageSize());
  });

  createEffect(() => {
    const max = totalPages() - 1;
    if (max >= 0 && page() > max) setPage(max);
  });

  const pagedSignals = createMemo(() => {
    const list = signals();
    if (!list) return [];
    const start = page() * pageSize();
    return list.slice(start, start + pageSize());
  });

  return (
    <div class="card signals-card" ref={tableEl}>
      <div class="card-header">
        <h2>Recent Signals</h2>
        <Show when={signals()}>
          {(list) => <span class="positions-count">{list().length} Signals</span>}
        </Show>
      </div>
      <Show when={signals()} fallback={<p>Loading...</p>}>
        {() => (
          <>
            <div class="table-wrapper">
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
                  <For each={pagedSignals()}>
                    {(s) => (
                      <tr>
                        <td class="time-cell">{new Date(s.timestamp).toLocaleString()}</td>
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
            </div>
            <Show when={totalPages() > 1}>
              <div class="pagination">
                <button
                  class="pagination-btn"
                  disabled={page() === 0}
                  onClick={() => setPage(0)}
                >
                  &laquo;
                </button>
                <button
                  class="pagination-btn"
                  disabled={page() === 0}
                  onClick={() => setPage(p => p - 1)}
                >
                  &lsaquo;
                </button>
                <span class="pagination-info">
                  Page {page() + 1} of {totalPages()}
                </span>
                <button
                  class="pagination-btn"
                  disabled={page() >= totalPages() - 1}
                  onClick={() => setPage(p => p + 1)}
                >
                  &rsaquo;
                </button>
                <button
                  class="pagination-btn"
                  disabled={page() >= totalPages() - 1}
                  onClick={() => setPage(totalPages() - 1)}
                >
                  &raquo;
                </button>
              </div>
            </Show>
          </>
        )}
      </Show>
    </div>
  );
}
