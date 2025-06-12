const axios = require('axios');
const ExchangeAPI = require('../../server/exchanges');

// Real API integration tests - run with caution due to rate limits
describe('External API Integration Tests', () => {
  let exchangeAPI;

  beforeEach(() => {
    exchangeAPI = new ExchangeAPI();
  });

  // Helper function to check if running in CI or skip real API tests
  const shouldSkipRealAPI = () => {
    return process.env.SKIP_REAL_API_TESTS === 'true' || process.env.CI === 'true';
  };

  describe('Real API Endpoints (Integration)', () => {
    // These tests hit real APIs and should be run sparingly
    
    it('should fetch real data from bitFlyer API', async () => {
      if (shouldSkipRealAPI()) {
        console.log('Skipping real API test for bitFlyer');
        return;
      }

      const result = await exchangeAPI.getBitFlyerPrice();
      
      if (result) {
        expect(result).toHaveProperty('exchange', 'bitFlyer');
        expect(result).toHaveProperty('price');
        expect(result).toHaveProperty('bid');
        expect(result).toHaveProperty('ask');
        expect(result).toHaveProperty('timestamp');
        expect(typeof result.price).toBe('number');
        expect(result.price).toBeGreaterThan(0);
      } else {
        console.warn('bitFlyer API returned null - might be rate limited or down');
      }
    }, 10000); // 10 second timeout

    it('should fetch real data from Coincheck API', async () => {
      if (shouldSkipRealAPI()) {
        console.log('Skipping real API test for Coincheck');
        return;
      }

      const result = await exchangeAPI.getCoincheckPrice();
      
      if (result) {
        expect(result).toHaveProperty('exchange', 'Coincheck');
        expect(result).toHaveProperty('price');
        expect(result).toHaveProperty('bid');
        expect(result).toHaveProperty('ask');
        expect(typeof result.price).toBe('number');
        expect(result.price).toBeGreaterThan(0);
      } else {
        console.warn('Coincheck API returned null');
      }
    }, 10000);

    it('should fetch real data from Zaif API', async () => {
      if (shouldSkipRealAPI()) {
        console.log('Skipping real API test for Zaif');
        return;
      }

      const result = await exchangeAPI.getZaifPrice();
      
      if (result) {
        expect(result).toHaveProperty('exchange', 'Zaif');
        expect(result).toHaveProperty('price');
        expect(typeof result.price).toBe('number');
        expect(result.price).toBeGreaterThan(0);
      } else {
        console.warn('Zaif API returned null');
      }
    }, 10000);

    it('should fetch real data from GMO API', async () => {
      if (shouldSkipRealAPI()) {
        console.log('Skipping real API test for GMO');
        return;
      }

      const result = await exchangeAPI.getGMOPrice();
      
      if (result) {
        expect(result).toHaveProperty('exchange', 'GMOコイン');
        expect(result).toHaveProperty('price');
        expect(typeof result.price).toBe('number');
        expect(result.price).toBeGreaterThan(0);
      } else {
        console.warn('GMO API returned null');
      }
    }, 10000);

    it('should fetch real data from bitbank API', async () => {
      if (shouldSkipRealAPI()) {
        console.log('Skipping real API test for bitbank');
        return;
      }

      const result = await exchangeAPI.getBitbankPrice();
      
      if (result) {
        expect(result).toHaveProperty('exchange', 'bitbank');
        expect(result).toHaveProperty('price');
        expect(typeof result.price).toBe('number');
        expect(result.price).toBeGreaterThan(0);
      } else {
        console.warn('bitbank API returned null');
      }
    }, 10000);

    it('should fetch real data from BITPoint API (via CoinGecko)', async () => {
      if (shouldSkipRealAPI()) {
        console.log('Skipping real API test for BITPoint');
        return;
      }

      const result = await exchangeAPI.getBitPointPrice();
      
      if (result) {
        expect(result).toHaveProperty('exchange', 'BITPoint');
        expect(result).toHaveProperty('price');
        expect(typeof result.price).toBe('number');
        expect(result.price).toBeGreaterThan(0);
      } else {
        console.warn('BITPoint (CoinGecko) API returned null');
      }
    }, 10000);

    it('should get all prices from real APIs', async () => {
      if (shouldSkipRealAPI()) {
        console.log('Skipping real API test for getAllPrices');
        return;
      }

      const results = await exchangeAPI.getAllPrices();
      
      expect(Array.isArray(results)).toBe(true);
      console.log(`Successfully fetched data from ${results.length} exchanges`);
      
      results.forEach(result => {
        expect(result).toHaveProperty('exchange');
        expect(result).toHaveProperty('price');
        expect(result).toHaveProperty('timestamp');
        expect(typeof result.price).toBe('number');
        expect(result.price).toBeGreaterThan(0);
      });
    }, 30000); // Longer timeout for multiple API calls
  });

  describe('API Response Format Validation', () => {
    // Mock tests to verify our API response handling
    
    it('should handle bitFlyer API response format correctly', async () => {
      const mockAxios = jest.spyOn(axios, 'get');
      mockAxios.mockResolvedValue({
        data: {
          ltp: 5000000,
          best_bid: 4999000,
          best_ask: 5001000,
          timestamp: '2023-01-01T00:00:00Z'
        }
      });

      const result = await exchangeAPI.getBitFlyerPrice();

      expect(result.exchange).toBe('bitFlyer');
      expect(result.price).toBe(5000000);
      expect(result.bid).toBe(4999000);
      expect(result.ask).toBe(5001000);

      mockAxios.mockRestore();
    });

    it('should handle Coincheck API response format correctly', async () => {
      const mockAxios = jest.spyOn(axios, 'get');
      mockAxios.mockResolvedValue({
        data: {
          last: 5000000,
          bid: 4999000,
          ask: 5001000,
          timestamp: '1640995200000'
        }
      });

      const result = await exchangeAPI.getCoincheckPrice();

      expect(result.exchange).toBe('Coincheck');
      expect(result.price).toBe(5000000);
      expect(result.bid).toBe(4999000);
      expect(result.ask).toBe(5001000);

      mockAxios.mockRestore();
    });

    it('should handle GMO API nested data format', async () => {
      const mockAxios = jest.spyOn(axios, 'get');
      mockAxios.mockResolvedValue({
        data: {
          status: 0,
          data: [{
            symbol: 'BTC_JPY',
            last: 5000000,
            bid: 4999000,
            ask: 5001000,
            timestamp: '2023-01-01T00:00:00.000Z'
          }]
        }
      });

      const result = await exchangeAPI.getGMOPrice();

      expect(result.exchange).toBe('GMOコイン');
      expect(result.price).toBe(5000000);
      expect(result.bid).toBe(4999000);
      expect(result.ask).toBe(5001000);

      mockAxios.mockRestore();
    });

    it('should handle bitbank API nested data format', async () => {
      const mockAxios = jest.spyOn(axios, 'get');
      mockAxios.mockResolvedValue({
        data: {
          success: 1,
          data: {
            last: 5000000,
            buy: 4999000,
            sell: 5001000,
            timestamp: 1640995200000
          }
        }
      });

      const result = await exchangeAPI.getBitbankPrice();

      expect(result.exchange).toBe('bitbank');
      expect(result.price).toBe(5000000);
      expect(result.bid).toBe(4999000);  // buy -> bid
      expect(result.ask).toBe(5001000);  // sell -> ask

      mockAxios.mockRestore();
    });

    it('should handle CoinGecko API format for BITPoint', async () => {
      const mockAxios = jest.spyOn(axios, 'get');
      mockAxios.mockResolvedValue({
        data: {
          bitcoin: {
            jpy: 5000000
          }
        }
      });

      const result = await exchangeAPI.getBitPointPrice();

      expect(result.exchange).toBe('BITPoint');
      expect(result.price).toBe(5000000);
      expect(result.bid).toBe(5000000);  // Using price as approximation
      expect(result.ask).toBe(5000000);  // Using price as approximation

      mockAxios.mockRestore();
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle network timeouts', async () => {
      const mockAxios = jest.spyOn(axios, 'get');
      mockAxios.mockRejectedValue(new Error('ETIMEDOUT'));

      const result = await exchangeAPI.getBitFlyerPrice();

      expect(result).toBeNull();

      mockAxios.mockRestore();
    });

    it('should handle API rate limiting (429 errors)', async () => {
      const mockAxios = jest.spyOn(axios, 'get');
      mockAxios.mockRejectedValue({
        response: { status: 429, data: { error: 'Rate limit exceeded' } }
      });

      const result = await exchangeAPI.getBitFlyerPrice();

      expect(result).toBeNull();

      mockAxios.mockRestore();
    });

    it('should handle malformed API responses', async () => {
      const mockAxios = jest.spyOn(axios, 'get');
      mockAxios.mockResolvedValue({
        data: {
          invalid: 'response',
          missing: 'required fields'
        }
      });

      const result = await exchangeAPI.getBitFlyerPrice();

      // Should handle gracefully and return valid structure or null
      if (result) {
        expect(result).toHaveProperty('exchange');
        expect(result).toHaveProperty('price');
      }

      mockAxios.mockRestore();
    });

    it('should handle partial API failures in getAllPrices', async () => {
      const mockAxios = jest.spyOn(axios, 'get');
      
      mockAxios
        .mockResolvedValueOnce({ data: { ltp: 5000000, best_bid: 4999000, best_ask: 5001000 } }) // bitFlyer success
        .mockRejectedValueOnce(new Error('Network error')) // Coincheck fail
        .mockResolvedValueOnce({ data: { last: 5100000, bid: 5099000, ask: 5101000 } }) // Zaif success
        .mockRejectedValueOnce(new Error('Rate limited')) // GMO fail
        .mockResolvedValueOnce({ data: { data: { last: 5050000, buy: 5049000, sell: 5051000 } } }) // bitbank success
        .mockRejectedValueOnce(new Error('Timeout')); // BITPoint fail

      const results = await exchangeAPI.getAllPrices();

      expect(results.length).toBe(3); // 3 successful, 3 failed
      expect(results.map(r => r.exchange)).toEqual(['bitFlyer', 'Zaif', 'bitbank']);

      mockAxios.mockRestore();
    });
  });

  describe('Performance and Load', () => {
    it('should complete API calls within timeout limits', async () => {
      if (shouldSkipRealAPI()) {
        console.log('Skipping performance test');
        return;
      }

      const startTime = Date.now();
      await exchangeAPI.getAllPrices();
      const duration = Date.now() - startTime;

      // Should complete within 30 seconds (generous timeout for all APIs)
      expect(duration).toBeLessThan(30000);
    }, 35000);

    it('should handle concurrent API calls', async () => {
      const mockAxios = jest.spyOn(axios, 'get');
      
      // Mock all APIs to return quickly
      mockAxios.mockImplementation((url) => {
        return new Promise(resolve => {
          setTimeout(() => {
            if (url.includes('bitflyer')) {
              resolve({ data: { ltp: 5000000, best_bid: 4999000, best_ask: 5001000 } });
            } else if (url.includes('coincheck')) {
              resolve({ data: { last: 5005000, bid: 5004000, ask: 5006000 } });
            } else if (url.includes('zaif')) {
              resolve({ data: { last: 5010000, bid: 5009000, ask: 5011000 } });
            } else if (url.includes('coin.z.com')) { // GMO
              resolve({ data: { data: [{ last: 5015000, bid: 5014000, ask: 5016000 }] } });
            } else if (url.includes('bitbank')) {
              resolve({ data: { data: { last: 5020000, buy: 5019000, sell: 5021000 } } });
            } else if (url.includes('coingecko')) { // BITPoint
              resolve({ data: { bitcoin: { jpy: 5025000 } } });
            } else {
              resolve({ data: { last: 5030000, bid: 5029000, ask: 5031000 } });
            }
          }, Math.random() * 100); // Random delay 0-100ms
        });
      });

      const promises = [
        exchangeAPI.getBitFlyerPrice(),
        exchangeAPI.getCoincheckPrice(),
        exchangeAPI.getZaifPrice(),
        exchangeAPI.getAllPrices()
      ];

      const results = await Promise.all(promises);
      
      expect(results[0]).not.toBeNull();
      expect(results[1]).not.toBeNull();
      expect(results[2]).not.toBeNull();
      expect(results[3]).toHaveLength(6); // All 6 APIs should succeed

      mockAxios.mockRestore();
    });
  });
});