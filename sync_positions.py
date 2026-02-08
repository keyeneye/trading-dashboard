#!/usr/bin/env python3
"""
Sync Alpaca positions to portfolio.db
Run manually or via cron to update dashboard positions without modifying the bot.
"""

import os
import sys
import sqlite3
from datetime import datetime
from pathlib import Path

# Add trading-bot to path
sys.path.insert(0, '/home/david/trading-bot')

from src.config import load_config
from src.execution.broker import AlpacaBroker
from src.risk.manager import RiskManager

def sync_positions():
    """Fetch positions from Alpaca and sync to SQLite database."""
    
    # Load config
    config_path = '/home/david/trading-bot/config/config.yaml'
    config = load_config(config_path if os.path.exists(config_path) else None)
    
    # Initialize broker
    risk_manager = RiskManager(config)
    broker = AlpacaBroker(config, risk_manager)
    
    # Get positions from Alpaca
    positions = broker.get_positions(use_cache=False)
    
    if not positions:
        print("No positions found in Alpaca account")
        return
    
    # Database path
    db_path = Path('/home/david/trading-bot/data/portfolio.db')
    
    # Connect to database
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Ensure table exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS positions (
            symbol TEXT PRIMARY KEY,
            quantity REAL NOT NULL DEFAULT 0,
            avg_entry_price REAL NOT NULL DEFAULT 0,
            current_price REAL DEFAULT 0,
            unrealized_pnl REAL DEFAULT 0,
            is_short INTEGER DEFAULT 0,
            last_updated TEXT
        )
    """)
    
    # Clear existing positions
    cursor.execute("DELETE FROM positions")
    
    # Insert current positions
    now = datetime.utcnow().isoformat()
    for pos in positions:
        cursor.execute("""
            INSERT INTO positions (symbol, quantity, avg_entry_price, current_price, 
                                 unrealized_pnl, is_short, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            pos['symbol'],
            pos['quantity'],
            pos['avg_entry_price'],
            pos['current_price'],
            pos['unrealized_pnl'],
            1 if pos.get('side') == 'short' else 0,
            now
        ))
    
    conn.commit()
    conn.close()
    
    print(f"✓ Synced {len(positions)} positions to database:")
    for pos in positions:
        side = "SHORT" if pos.get('side') == 'short' else "LONG"
        print(f"  {pos['symbol']}: {side} {pos['quantity']} @ ${pos['avg_entry_price']:.2f}")

if __name__ == "__main__":
    try:
        sync_positions()
    except Exception as e:
        print(f"Error syncing positions: {e}")
        sys.exit(1)
