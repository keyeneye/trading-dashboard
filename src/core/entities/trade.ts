export interface Trade {
  id: number;
  timestamp: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  total_value: number;
  strategy: string;
  order_id: string;
  notes: string;
}
