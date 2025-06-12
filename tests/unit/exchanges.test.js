// Mock axios before requiring modules
jest.mock('axios', () => ({
  get: jest.fn()
}));

const ExchangeAPI = require('../../server/exchanges');
const axios = require('axios');

describe('ExchangeAPI', () => {
  let exchangeAPI;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all axios mocks
    axios.get.mockReset();
    exchangeAPI = new ExchangeAPI();
  });

  describe('getBitFlyerPrice', () => {
    it('should return formatted price data on successful API call', async () => {
      const mockResponse = {
        data: {
          ltp: 5000000,
          best_bid: 4999000,
          best_ask: 5001000
        }
      };
      
      axios.get.mockResolvedValue(mockResponse);

      const result = await exchangeAPI.getBitFlyerPrice();

      expect(result).toEqual({
        exchange: 'bitFlyer',
        price: 5000000,
        bid: 4999000,
        ask: 5001000,
        timestamp: expect.any(String)
      });
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.bitflyer.com/v1/ticker?product_code=BTC_JPY',
        { timeout: 5000 }
      );
    });

    it('should return null on API error', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      const result = await exchangeAPI.getBitFlyerPrice();

      expect(result).toBeNull();
    });
  });

  describe('getCoincheckPrice', () => {
    it('should return formatted price data on successful API call', async () => {
      const mockResponse = {
        data: {
          last: 5000000,
          bid: 4999000,
          ask: 5001000
        }
      };
      
      axios.get.mockResolvedValue(mockResponse);

      const result = await exchangeAPI.getCoincheckPrice();

      expect(result).toEqual({
        exchange: 'Coincheck',
        price: 5000000,
        bid: 4999000,
        ask: 5001000,
        timestamp: expect.any(String)
      });
    });

    it('should return null on API error', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      const result = await exchangeAPI.getCoincheckPrice();

      expect(result).toBeNull();
    });
  });

  describe('getZaifPrice', () => {
    it('should return formatted price data on successful API call', async () => {
      const mockResponse = {
        data: {
          last: 5000000,
          bid: 4999000,
          ask: 5001000
        }
      };
      
      axios.get.mockResolvedValue(mockResponse);

      const result = await exchangeAPI.getZaifPrice();

      expect(result).toEqual({
        exchange: 'Zaif',
        price: 5000000,
        bid: 4999000,
        ask: 5001000,
        timestamp: expect.any(String)
      });
    });
  });

  describe('getGMOPrice', () => {
    it('should return formatted price data on successful API call', async () => {
      const mockResponse = {
        data: {
          data: [{
            last: 5000000,
            bid: 4999000,
            ask: 5001000
          }]
        }
      };
      
      axios.get.mockResolvedValue(mockResponse);

      const result = await exchangeAPI.getGMOPrice();

      expect(result).toEqual({
        exchange: 'GMOコイン',
        price: 5000000,
        bid: 4999000,
        ask: 5001000,
        timestamp: expect.any(String)
      });
    });
  });

  describe('getBitbankPrice', () => {
    it('should return formatted price data on successful API call', async () => {
      const mockResponse = {
        data: {
          data: {
            last: 5000000,
            buy: 4999000,
            sell: 5001000
          }
        }
      };
      
      axios.get.mockResolvedValue(mockResponse);

      const result = await exchangeAPI.getBitbankPrice();

      expect(result).toEqual({
        exchange: 'bitbank',
        price: 5000000,
        bid: 4999000,
        ask: 5001000,
        timestamp: expect.any(String)
      });
    });
  });

  describe('getBitPointPrice', () => {
    it('should return formatted price data on successful API call', async () => {
      const mockResponse = {
        data: {
          bitcoin: {
            jpy: 5000000
          }
        }
      };
      
      axios.get.mockResolvedValue(mockResponse);

      const result = await exchangeAPI.getBitPointPrice();

      expect(result).toEqual({
        exchange: 'BITPoint',
        price: 5000000,
        bid: 5000000,
        ask: 5000000,
        timestamp: expect.any(String)
      });
    });
  });

  describe('getAllPrices', () => {
    it('should return array of successful price data only', async () => {
      const mockBitFlyerResponse = {
        data: { ltp: 5000000, best_bid: 4999000, best_ask: 5001000 }
      };
      const mockCoincheckResponse = {
        data: { last: 5005000, bid: 5004000, ask: 5006000 }
      };

      axios.get
        .mockResolvedValueOnce(mockBitFlyerResponse)  // bitFlyer success
        .mockResolvedValueOnce(mockCoincheckResponse) // Coincheck success
        .mockRejectedValueOnce(new Error('Zaif error')) // Zaif error
        .mockRejectedValueOnce(new Error('GMO error'))  // GMO error
        .mockRejectedValueOnce(new Error('bitbank error')) // bitbank error
        .mockRejectedValueOnce(new Error('BITPoint error')); // BITPoint error

      const result = await exchangeAPI.getAllPrices();

      expect(result).toHaveLength(2);
      expect(result[0].exchange).toBe('bitFlyer');
      expect(result[1].exchange).toBe('Coincheck');
    });

    it('should return empty array when all APIs fail', async () => {
      axios.get.mockRejectedValue(new Error('Network error'));

      const result = await exchangeAPI.getAllPrices();

      expect(result).toEqual([]);
    });
  });
});