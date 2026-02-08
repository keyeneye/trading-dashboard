export interface Position {
  symbol: string;
  quantity: number;
  avg_entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  is_short: number;
  last_updated: string;
}

export function isShortPosition(pos: Position): boolean {
  return pos.is_short === 1;
}

export function calculatePositionPnL(pos: Position): number {
  if (isShortPosition(pos)) {
    return (pos.avg_entry_price - pos.current_price) * pos.quantity;
  }
  return (pos.current_price - pos.avg_entry_price) * pos.quantity;
}
