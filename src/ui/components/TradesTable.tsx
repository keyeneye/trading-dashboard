import { For, Show, createResource, createSignal, createMemo, createEffect, onCleanup } from "solid-js";
import { api } from "@app/services/trading";

interface Trade {
  id: number;
  timestamp: string;
  symbol: string;
  side: "buy" | "sell" | "short" | "cover";
  quantity: number;
  price: number;
  total_value: number;
  strategy: string;
  order_id: string;
  notes: string;
}

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

function getSideClass(side: string): string {
  switch (side) {
    case "buy":
    case "cover":
      return "positive";
    case "sell":
    case "short":
      return "negative";
    default:
      return "";
  }
}

function getSideLabel(side: string): string {
  return side.toUpperCase();
}

export default function TradesTable() {
  const [trades] = createResource(async () => {
    try { return await api.getTrades(undefined, 500); }
    catch (e) { console.error(e); return undefined; }
  });

  let tableEl: HTMLDivElement | undefined;
  const pageSize = usePageSize(() => tableEl);
  const [page, setPage] = createSignal(0);

  const totalPages = createMemo(() => {
    const list = trades();
    if (!list) return 0;
    return Math.ceil(list.length / pageSize());
  });

  createEffect(() => {
    const max = totalPages() - 1;
    if (max >= 0 && page() > max) setPage(max);
  });

  const pagedTrades = createMemo(() => {
    const list = trades();
    if (!list) return [];
    const start = page() * pageSize();
    return list.slice(start, start + pageSize());
  });

  return (
    <div class="card trades-card" ref={tableEl}>
      <div class="card-header">
        <h2>Recent Trades</h2>
        <Show when={trades()}>
          {(list) => <span class="positions-count">{list().length} Trades</span>}
        </Show>
      </div>
      <Show when={trades()} fallback={<p>Loading...</p>}>
        {() => (
          <>
            <div class="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Symbol</th>
                    <th>Side</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Strategy</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={pagedTrades()}>
                    {(t: Trade) => (
                      <tr>
                        <td class="time-cell">{new Date(t.timestamp).toLocaleString()}</td>
                        <td class="symbol">{t.symbol}</td>
                        <td class={getSideClass(t.side)}>
                          <span class={`badge ${getSideClass(t.side)}`}>
                            {getSideLabel(t.side)}
                          </span>
                        </td>
                        <td class="qty">{t.quantity}</td>
                        <td class="price">${t.price.toFixed(2)}</td>
                        <td>{t.strategy}</td>
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
