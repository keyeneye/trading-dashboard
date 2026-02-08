export interface Position {
  symbol: string;
  quantity: number;
  avg_entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  last_updated: string;
}

export function isShortPosition(pos: Position): boolean {
  return pos.quantity < 0;
}

export function calculatePositionPnL(pos: Position): number {
  return (pos.current_price - pos.avg_entry_price) * pos.quantity;
}
