# Trading Dashboard

Real-time trading dashboard built with SolidJS. Displays portfolio data, open positions, trade history, and strategy signals from the AutoTrader ecosystem.

## Overview

Interactive web dashboard that connects to the Trading API via REST and WebSocket for real-time updates.

## Features

- 📊 **Portfolio View**: Equity charts, position summary, Fibonacci projections
- 💼 **Trades Table**: Historical and today's trades with filtering
- 📈 **Signals Feed**: Real-time strategy signals as they occur
- 🔄 **Live Updates**: WebSocket connection for instant data refresh
- 📱 **Responsive**: Works on desktop and mobile
- 🎨 **Dark Theme**: Professional trading interface

## Architecture

Part of the 3-service AutoTrader ecosystem:

```
┌─────────────────────────────────────────────────────────────┐
│                   Trading Dashboard                          │
│                     (This Project)                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Dashboard  │  │   Trades    │  │      Signals        │ │
│  │    Page     │  │    Page     │  │       Page          │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
└─────────┼────────────────┼────────────────────┼────────────┘
          │                │                    │
          └────────────────┴────────────────────┘
                           │
            REST API / WebSocket
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    trading-nginx                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  • Serves static files (built dashboard)               ││
│  │  • Proxies /api/* to trading-api:8000                 ││
│  │  • Proxies /ws to trading-api:8000 (WebSocket)        ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    trading-api                               │
│              (REST API + WebSocket Server)                   │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### With Docker Compose (Recommended)

The dashboard is automatically built and served as part of the trading-bot stack:

```bash
# From trading-bot directory
docker-compose up -d

# Access at http://localhost:8080
```

### Local Development

```bash
npm install
npm run dev

# Dashboard will be at http://localhost:3000
# NOTE: API must be running at localhost:8000 (configure in vite.config.ts proxy)
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# API endpoint (used during build for static assets)
VITE_API_URL=http://localhost:8000
```

**Note:** In development (`npm run dev`), the Vite proxy handles API routing:
- `/api/*` → `http://localhost:8000`
- `/ws` → `ws://localhost:8000`

In production (Docker), nginx handles the proxying.

## Pages

### Dashboard (`/`)
- Portfolio summary card
- Fibonacci projection levels (38.2%, 50%, 61.8%)
- Open positions table with live P&L
- Real-time feed (signals & trades)

### Trades (`/trades`)
- Complete trade history
- Columns: Time, Symbol, Side, Qty, Price, Strategy
- Shows both bot-executed and manually imported trades

### Signals (`/signals`)
- Strategy signals feed
- Shows signal strength and execution status
- Real-time updates via WebSocket

## Data Synchronization Notes

**Important:** The dashboard displays data from the SQLite database, which only contains:
- ✅ Trades executed by the trading-bot
- ✅ Positions tracked by the bot
- ✅ Signals generated by the bot

**Manual Alpaca trades won't appear automatically.** To import them, use the sync commands available in the trading-bot project (see trading-bot README for details).

## Technology Stack

- **Framework**: SolidJS 1.9
- **Router**: @solidjs/router
- **Build Tool**: Vite 6
- **Styling**: CSS with CSS Variables
- **API**: REST + WebSocket

## Project Structure

```
src/
├── App.tsx                      # Main app with router
├── index.tsx                    # Entry point
├── app/services/
│   └── trading.ts               # Trading data service (signals, resources)
├── core/
│   ├── entities/                # TypeScript interfaces
│   │   ├── position.ts
│   │   ├── trade.ts
│   │   ├── signal.ts
│   │   └── portfolio.ts
│   └── ports/                   # API/WebSocket interfaces
├── infra/
│   ├── api/client.ts            # REST API client
│   └── ws/client.ts             # WebSocket client
└── ui/
    ├── components/              # Reusable components
    │   ├── PositionsTable.tsx
    │   ├── TradesTable.tsx
    │   ├── SignalsTable.tsx
    │   ├── FibonacciChart.tsx
    │   ├── EquityChart.tsx
    │   └── RealtimeFeed.tsx
    ├── pages/                   # Route pages
    │   ├── Dashboard.tsx
    │   ├── TradesPage.tsx
    │   └── SignalsPage.tsx
    └── layouts/
        └── MainLayout.tsx
```

## Development

```bash
# Install dependencies
npm install

# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Integration with Trading Ecosystem

This dashboard is designed to work as the UI layer:

1. **Trading Bot** (`trading-bot/`) - Executes strategies, writes to DB
2. **Trading API** (`trading-api/`) - Reads DB, exposes REST/WebSocket
3. **Trading Dashboard** (`trading-dashboard/`) - This project - Visualizes data

All three services are orchestrated via Docker Compose in the `trading-bot` project.

## License

MIT
