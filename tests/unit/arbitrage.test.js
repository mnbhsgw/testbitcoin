const ArbitrageDetector = require('../../server/arbitrage');

// Mock Database and FeeCalculator
const mockDatabase = {
  saveArbitrageOpportunity: jest.fn().mockResolvedValue(undefined)
};

// Mock FeeCalculator
jest.mock('../../server/fees', () => {
  return class FeeCalculator {
    calculateArbitrageCosts(exchangeFrom, exchangeTo, amount, buyPrice, sellPrice) {
      // Simple mock calculation
      const totalCosts = {
        total: 50000 // 50,000 JPY in fees
      };
      const netProfit = (sellPrice - buyPrice) * amount - totalCosts.total;
      
      return {
        netProfit,
        totalCosts,
        costBreakdown: {
          tradingFees: 25000,
          withdrawalFees: 25000
        }
      };
    }
  };
});

describe('ArbitrageDetector', () => {
  let arbitrageDetector;

  beforeEach(() => {
    arbitrageDetector = new ArbitrageDetector(mockDatabase);
    jest.clearAllMocks();
  });

  describe('detectArbitrageOpportunities', () => {
    it('should detect arbitrage opportunity when price difference exceeds threshold', () => {
      const prices = [
        {
          exchange: 'Exchange1',
          price: 5000000,
          bid: 4999000,
          ask: 5001000
        },
        {
          exchange: 'Exchange2',
          price: 5100000,
          bid: 5099000,
          ask: 5101000
        }
      ];

      const opportunities = arbitrageDetector.detectArbitrageOpportunities(prices);

      expect(opportunities).toHaveLength(1);
      expect(opportunities[0]).toMatchObject({
        exchangeFrom: 'Exchange1',
        exchangeTo: 'Exchange2',
        priceFrom: 5001000,
        priceTo: 5099000,
        priceDifference: 98000,
        percentageDifference: expect.any(Number)
      });
      expect(opportunities[0].percentageDifference).toBeGreaterThan(0.1);
    });

    it('should not detect opportunity when price difference is below threshold', () => {
      const prices = [
        {
          exchange: 'Exchange1',
          price: 5000000,
          bid: 4999000,
          ask: 5001000
        },
        {
          exchange: 'Exchange2',
          price: 5003000,
          bid: 5002000,
          ask: 5004000
        }
      ];

      const opportunities = arbitrageDetector.detectArbitrageOpportunities(prices);

      expect(opportunities).toHaveLength(0);
    });

    it('should detect bidirectional opportunities', () => {
      const prices = [
        {
          exchange: 'Exchange1',
          price: 5000000,
          bid: 4999000,
          ask: 5001000
        },
        {
          exchange: 'Exchange2',
          price: 5200000,
          bid: 5199000,
          ask: 5201000
        }
      ];

      const opportunities = arbitrageDetector.detectArbitrageOpportunities(prices);

      expect(opportunities.length).toBeGreaterThan(0);
      
      // Check if opportunities are sorted by net profit
      if (opportunities.length > 1) {
        for (let i = 1; i < opportunities.length; i++) {
          expect(opportunities[i-1].netProfit).toBeGreaterThanOrEqual(opportunities[i].netProfit);
        }
      }
    });

    it('should handle empty prices array', () => {
      const opportunities = arbitrageDetector.detectArbitrageOpportunities([]);
      expect(opportunities).toHaveLength(0);
    });

    it('should handle single price entry', () => {
      const prices = [{
        exchange: 'Exchange1',
        price: 5000000,
        bid: 4999000,
        ask: 5001000
      }];

      const opportunities = arbitrageDetector.detectArbitrageOpportunities(prices);
      expect(opportunities).toHaveLength(0);
    });

    it('should include fee calculations in opportunities', () => {
      const prices = [
        {
          exchange: 'Exchange1',
          price: 5000000,
          bid: 4999000,
          ask: 5001000
        },
        {
          exchange: 'Exchange2',
          price: 5200000,
          bid: 5199000,
          ask: 5201000
        }
      ];

      const opportunities = arbitrageDetector.detectArbitrageOpportunities(prices);

      if (opportunities.length > 0) {
        expect(opportunities[0]).toHaveProperty('netProfit');
        expect(opportunities[0]).toHaveProperty('netProfitPercentage');
        expect(opportunities[0]).toHaveProperty('totalFees');
        expect(opportunities[0]).toHaveProperty('feeBreakdown');
        expect(opportunities[0]).toHaveProperty('isProfitableAfterFees');
      }
    });

    it('should save opportunities to database', () => {
      const prices = [
        {
          exchange: 'Exchange1',
          price: 5000000,
          bid: 4999000,
          ask: 5001000
        },
        {
          exchange: 'Exchange2',
          price: 5200000,
          bid: 5199000,
          ask: 5201000
        }
      ];

      arbitrageDetector.detectArbitrageOpportunities(prices);

      expect(mockDatabase.saveArbitrageOpportunity).toHaveBeenCalled();
    });
  });

  describe('formatOpportunityMessage', () => {
    it('should format opportunity message correctly', () => {
      const opportunity = {
        exchangeFrom: 'Exchange1',
        exchangeTo: 'Exchange2',
        priceFrom: 5001000,
        priceTo: 5099000,
        percentageDifference: 1.96
      };

      const message = arbitrageDetector.formatOpportunityMessage(opportunity);

      expect(message).toContain('Exchange1');
      expect(message).toContain('Exchange2');
      expect(message).toContain('¥5,001,000');
      expect(message).toContain('¥5,099,000');
      expect(message).toContain('1.96%');
    });
  });

  describe('calculatePotentialProfit', () => {
    it('should calculate profit correctly for given amount', () => {
      const opportunity = {
        priceFrom: 5001000,
        priceTo: 5099000
      };

      const profit = arbitrageDetector.calculatePotentialProfit(opportunity, 2);

      expect(profit).toBe((2 * 5099000) - (2 * 5001000));
    });

    it('should use default amount of 1 if not specified', () => {
      const opportunity = {
        priceFrom: 5001000,
        priceTo: 5099000
      };

      const profit = arbitrageDetector.calculatePotentialProfit(opportunity);

      expect(profit).toBe(5099000 - 5001000);
    });
  });

  describe('threshold configuration', () => {
    it('should use 0.1% as default threshold', () => {
      expect(arbitrageDetector.threshold).toBe(0.1);
    });
  });
});