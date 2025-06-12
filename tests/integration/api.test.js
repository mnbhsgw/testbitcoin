const request = require('supertest');
const express = require('express');
const cors = require('cors');

// Mock the dependencies
jest.mock('../../server/exchanges');
jest.mock('../../server/database');
jest.mock('../../server/arbitrage');

const ExchangeAPI = require('../../server/exchanges');
const Database = require('../../server/database');
const ArbitrageDetector = require('../../server/arbitrage');

describe('API Endpoints', () => {
  let app;
  let mockDatabase;
  let mockExchangeAPI;
  let mockArbitrageDetector;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockDatabase = {
      getRecentPrices: jest.fn(),
      getArbitrageHistory: jest.fn(),
      getPriceHistory: jest.fn(),
      clearAllData: jest.fn(),
      savePrices: jest.fn(),
      saveArbitrageOpportunity: jest.fn(),
      close: jest.fn()
    };

    mockExchangeAPI = {
      getAllPrices: jest.fn()
    };

    mockArbitrageDetector = {
      detectArbitrageOpportunities: jest.fn(),
      formatOpportunityMessage: jest.fn()
    };

    // Mock constructors
    Database.mockImplementation(() => mockDatabase);
    ExchangeAPI.mockImplementation(() => mockExchangeAPI);
    ArbitrageDetector.mockImplementation(() => mockArbitrageDetector);

    // Create Express app (simplified version of server/index.js)
    app = express();
    app.use(cors());
    app.use(express.json());

    // Mock current data
    let currentPrices = [
      { exchange: 'bitFlyer', price: 5000000, bid: 4999000, ask: 5001000 },
      { exchange: 'Coincheck', price: 5005000, bid: 5004000, ask: 5006000 }
    ];
    let currentOpportunities = [
      {
        exchangeFrom: 'bitFlyer',
        exchangeTo: 'Coincheck',
        priceFrom: 5001000,
        priceTo: 5004000,
        priceDifference: 3000,
        percentageDifference: 0.06
      }
    ];

    // Define routes
    app.get('/api/prices', (req, res) => {
      res.json({
        prices: currentPrices,
        opportunities: currentOpportunities,
        timestamp: '2023-01-01T00:00:00Z'
      });
    });

    app.get('/api/history', async (req, res) => {
      try {
        const priceHistory = await mockDatabase.getRecentPrices(100);
        const arbitrageHistory = await mockDatabase.getArbitrageHistory(50);
        
        res.json({
          priceHistory,
          arbitrageHistory
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch history' });
      }
    });

    // Input validation middleware
    function validateHoursParam(req, res, next) {
      const hours = req.query.hours;
      if (hours !== undefined) {
        const parsed = parseInt(hours);
        if (isNaN(parsed) || parsed < 1 || parsed > 168) {
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
        const priceHistory = await mockDatabase.getPriceHistory(hours);
        
        res.json({
          priceHistory
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch price history' });
      }
    });

    app.delete('/api/clear-data', async (req, res) => {
      try {
        await mockDatabase.clearAllData();
        res.json({ message: 'All price history and arbitrage data cleared successfully' });
      } catch (error) {
        res.status(500).json({ error: 'Failed to clear data' });
      }
    });

    app.get('/api/export-csv', validateHoursParam, async (req, res) => {
      try {
        const hours = req.validatedHours;
        const priceHistory = await mockDatabase.getPriceHistory(hours);
        
        let csv = 'Exchange,Price,Bid,Ask,Timestamp,Created_At\n';
        priceHistory.forEach(row => {
          csv += `${row.exchange},${row.price || ''},${row.bid || ''},${row.ask || ''},${row.timestamp},${row.created_at}\n`;
        });
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="price_history_${hours}h.csv"`);
        res.send(csv);
      } catch (error) {
        res.status(500).json({ error: 'Failed to export CSV' });
      }
    });
  });

  describe('GET /api/prices', () => {
    it('should return current prices and opportunities', async () => {
      const response = await request(app)
        .get('/api/prices')
        .expect(200);

      expect(response.body).toHaveProperty('prices');
      expect(response.body).toHaveProperty('opportunities');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.prices).toHaveLength(2);
      expect(response.body.opportunities).toHaveLength(1);
    });

    it('should return proper JSON structure', async () => {
      const response = await request(app)
        .get('/api/prices')
        .expect(200)
        .expect('Content-Type', /json/);

      expect(response.body.prices[0]).toHaveProperty('exchange');
      expect(response.body.prices[0]).toHaveProperty('price');
      expect(response.body.prices[0]).toHaveProperty('bid');
      expect(response.body.prices[0]).toHaveProperty('ask');
    });
  });

  describe('GET /api/history', () => {
    it('should return price and arbitrage history', async () => {
      const mockPriceHistory = [
        { id: 1, exchange: 'bitFlyer', price: 5000000, timestamp: '2023-01-01T00:00:00Z' }
      ];
      const mockArbitrageHistory = [
        { id: 1, exchange_from: 'bitFlyer', exchange_to: 'Coincheck', price_difference: 3000 }
      ];

      mockDatabase.getRecentPrices.mockResolvedValue(mockPriceHistory);
      mockDatabase.getArbitrageHistory.mockResolvedValue(mockArbitrageHistory);

      const response = await request(app)
        .get('/api/history')
        .expect(200);

      expect(response.body).toHaveProperty('priceHistory');
      expect(response.body).toHaveProperty('arbitrageHistory');
      expect(mockDatabase.getRecentPrices).toHaveBeenCalledWith(100);
      expect(mockDatabase.getArbitrageHistory).toHaveBeenCalledWith(50);
    });

    it('should handle database errors', async () => {
      mockDatabase.getRecentPrices.mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/api/history')
        .expect(500);
    });
  });

  describe('GET /api/price-history', () => {
    it('should return price history with default 24 hours', async () => {
      const mockPriceHistory = [
        { exchange: 'bitFlyer', price: 5000000, timestamp: '2023-01-01T00:00:00Z' }
      ];

      mockDatabase.getPriceHistory.mockResolvedValue(mockPriceHistory);

      const response = await request(app)
        .get('/api/price-history')
        .expect(200);

      expect(response.body).toHaveProperty('priceHistory');
      expect(mockDatabase.getPriceHistory).toHaveBeenCalledWith(24);
    });

    it('should accept hours parameter', async () => {
      mockDatabase.getPriceHistory.mockResolvedValue([]);

      await request(app)
        .get('/api/price-history?hours=48')
        .expect(200);

      expect(mockDatabase.getPriceHistory).toHaveBeenCalledWith(48);
    });

    it('should validate hours parameter', async () => {
      await request(app)
        .get('/api/price-history?hours=200')
        .expect(400);

      await request(app)
        .get('/api/price-history?hours=-1')
        .expect(400);

      await request(app)
        .get('/api/price-history?hours=abc')
        .expect(400);
    });
  });

  describe('DELETE /api/clear-data', () => {
    it('should clear all data successfully', async () => {
      mockDatabase.clearAllData.mockResolvedValue();

      const response = await request(app)
        .delete('/api/clear-data')
        .expect(200);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('cleared successfully');
      expect(mockDatabase.clearAllData).toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      mockDatabase.clearAllData.mockRejectedValue(new Error('Database error'));

      await request(app)
        .delete('/api/clear-data')
        .expect(500);
    });
  });

  describe('GET /api/export-csv', () => {
    it('should export CSV with default 24 hours', async () => {
      const mockPriceHistory = [
        {
          exchange: 'bitFlyer',
          price: 5000000,
          bid: 4999000,
          ask: 5001000,
          timestamp: '2023-01-01T00:00:00Z',
          created_at: '2023-01-01 00:00:00'
        }
      ];

      mockDatabase.getPriceHistory.mockResolvedValue(mockPriceHistory);

      const response = await request(app)
        .get('/api/export-csv')
        .expect(200)
        .expect('Content-Type', 'text/csv; charset=utf-8');

      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.headers['content-disposition']).toContain('price_history_24h.csv');
      expect(response.text).toContain('Exchange,Price,Bid,Ask,Timestamp,Created_At');
      expect(response.text).toContain('bitFlyer,5000000,4999000,5001000');
    });

    it('should accept hours parameter for CSV export', async () => {
      mockDatabase.getPriceHistory.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/export-csv?hours=72')
        .expect(200);

      expect(response.headers['content-disposition']).toContain('price_history_72h.csv');
      expect(mockDatabase.getPriceHistory).toHaveBeenCalledWith(72);
    });

    it('should handle database errors during CSV export', async () => {
      mockDatabase.getPriceHistory.mockRejectedValue(new Error('Database error'));

      await request(app)
        .get('/api/export-csv')
        .expect(500);
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/prices')
        .expect(200);

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });
  });

  describe('Error handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      await request(app)
        .get('/api/non-existent')
        .expect(404);
    });
  });
});