# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start both server and client in development mode concurrently
- `npm run server` - Start only the Node.js server with nodemon (port 3001)
- `npm run client` - Start only the React client (port 3000)
- `npm run install-deps` - Install dependencies for both root and client directories
- `npm run build` - Build the React client for production

### Testing
- `cd client && npm test` - Run React tests with Jest

## Architecture

This is a Bitcoin arbitrage monitoring web application with a real-time client-server architecture:

### Backend (Node.js/Express)
- **Server entry point**: `server/index.js` - Main server with WebSocket and HTTP endpoints
- **Exchange APIs**: `server/exchanges.js` - Fetches BTC/JPY prices from bitFlyer, Coincheck, and Zaif
- **Arbitrage detection**: `server/arbitrage.js` - Detects price differences >1% between exchanges
- **Database**: `server/database.js` - SQLite database for price history and arbitrage opportunities
- **Real-time updates**: WebSocket broadcasting price updates every 5 seconds

### Frontend (React)
- **Main component**: `client/src/App.js` - Single-page app with WebSocket connection
- **Proxy setup**: Client proxies API requests to `http://localhost:3001`
- **Real-time UI**: WebSocket connection for live price updates and arbitrage notifications

### Key Data Flow
1. Server fetches prices from 3 exchanges every 5 seconds
2. ArbitrageDetector analyzes price differences (threshold: 1%)
3. Database stores all prices and detected opportunities
4. WebSocket broadcasts updates to connected React clients
5. Client displays real-time prices and arbitrage opportunities

### Configuration
- Arbitrage threshold: 1% (configurable in `server/arbitrage.js:16`)
- Price fetch interval: 5 seconds (configurable in `server/index.js:115`)
- Database file: `server/arbitrage.db` (SQLite)

### API Endpoints
- `GET /api/prices` - Current prices and opportunities
- `GET /api/history` - Historical price and arbitrage data