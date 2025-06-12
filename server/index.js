const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');
const ExchangeAPI = require('./exchanges');
const Database = require('./database');
const ArbitrageDetector = require('./arbitrage');
const { getJapanTime } = require('./utils');

const app = express();
const server = http.createServer(app);
// WebSocket server with connection limits
const wss = new WebSocket.Server({ 
  server,
  maxPayload: 16 * 1024, // 16KB max payload
  clientTracking: true
});

const PORT = process.env.PORT || 3001;

// CORS configuration - restrict in production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000']
    : true,
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

const exchangeAPI = new ExchangeAPI();
const database = new Database();
const arbitrageDetector = new ArbitrageDetector(database);

let currentPrices = [];
let currentOpportunities = [];

app.get('/api/prices', (req, res) => {
  res.json({
    prices: currentPrices,
    opportunities: currentOpportunities,
    timestamp: getJapanTime()
  });
});

app.get('/api/history', async (req, res) => {
  try {
    const priceHistory = await database.getRecentPrices(100);
    const arbitrageHistory = await database.getArbitrageHistory(50);
    
    res.json({
      priceHistory,
      arbitrageHistory
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Input validation middleware
function validateHoursParam(req, res, next) {
  const hours = req.query.hours;
  if (hours !== undefined) {
    const parsed = parseInt(hours);
    if (isNaN(parsed) || parsed < 1 || parsed > 168) { // Max 1 week
      return res.status(400).json({ error: 'Invalid hours parameter. Must be between 1 and 168.' });
    }
    req.validatedHours = parsed;
  } else {
    req.validatedHours = 24;
  }
  next();
}

app.get('/api/price-history', validateHoursParam, async (req, res) => {
  try {
    const hours = req.validatedHours;
    const priceHistory = await database.getPriceHistory(hours);
    
    res.json({
      priceHistory
    });
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
});

app.delete('/api/clear-data', async (req, res) => {
  try {
    await database.clearAllData();
    res.json({ message: 'All price history and arbitrage data cleared successfully' });
  } catch (error) {
    console.error('Error clearing data:', error);
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

app.get('/api/export-csv', validateHoursParam, async (req, res) => {
  try {
    const hours = req.validatedHours;
    const priceHistory = await database.getPriceHistory(hours);
    
    // CSV header
    let csv = 'Exchange,Price,Bid,Ask,Timestamp,Created_At\n';
    
    // CSV data rows
    priceHistory.forEach(row => {
      csv += `${row.exchange},${row.price || ''},${row.bid || ''},${row.ask || ''},${row.timestamp},${row.created_at}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="price_history_${hours}h.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Track connections for rate limiting
let connectionCount = 0;
const MAX_CONNECTIONS = 50;

wss.on('connection', (ws, req) => {
  connectionCount++;
  
  if (connectionCount > MAX_CONNECTIONS) {
    ws.close(1013, 'Server overloaded');
    connectionCount--;
    return;
  }
  
  console.log(`Client connected via WebSocket (${connectionCount}/${MAX_CONNECTIONS})`);
  
  ws.send(JSON.stringify({
    type: 'initial_data',
    prices: currentPrices,
    opportunities: currentOpportunities
  }));

  ws.on('close', () => {
    connectionCount--;
    console.log(`Client disconnected (${connectionCount}/${MAX_CONNECTIONS})`);
  });
});

function broadcastToClients(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

async function fetchPricesAndDetectArbitrage() {
  try {
    const prices = await exchangeAPI.getAllPrices();
    
    if (prices.length > 0) {
      currentPrices = prices;
      
      await database.savePrices(prices);
      
      const opportunities = arbitrageDetector.detectArbitrageOpportunities(prices);
      currentOpportunities = opportunities;
      
      const data = {
        type: 'price_update',
        prices: currentPrices,
        opportunities: currentOpportunities,
        timestamp: getJapanTime()
      };
      
      broadcastToClients(data);
      
      if (opportunities.length > 0) {
        console.log(`Found ${opportunities.length} arbitrage opportunities:`);
        opportunities.forEach(opp => {
          console.log(arbitrageDetector.formatOpportunityMessage(opp));
        });
      }
    }
  } catch (error) {
    console.error('Error in price fetching cycle:', error);
  }
}

setInterval(fetchPricesAndDetectArbitrage, 5000);

fetchPricesAndDetectArbitrage();

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server started`);
  console.log(`Price monitoring started - fetching every 5 seconds`);
});

process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  database.close();
  server.close(() => {
    process.exit(0);
  });
});