function getJapanTime() {
  return new Date().toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).replace(/\//g, '-').replace(/ /g, 'T');
}

class ArbitrageDetector {
  constructor(database) {
    this.db = database;
    this.threshold = 0.1; // 0.1% threshold for arbitrage opportunities
  }

  detectArbitrageOpportunities(prices) {
    const opportunities = [];
    
    if (prices.length < 2) return opportunities;

    for (let i = 0; i < prices.length; i++) {
      for (let j = i + 1; j < prices.length; j++) {
        const exchange1 = prices[i];
        const exchange2 = prices[j];
        
        // Check if exchange1.ask < exchange2.bid (buy at exchange1, sell at exchange2)
        if (exchange1.ask && exchange2.bid && exchange1.ask < exchange2.bid) {
          const priceDiff = exchange2.bid - exchange1.ask;
          const percentageDiff = (priceDiff / exchange1.ask) * 100;
          
          if (percentageDiff >= this.threshold) {
            const opportunity = {
              exchangeFrom: exchange1.exchange,
              exchangeTo: exchange2.exchange,
              priceFrom: exchange1.ask,
              priceTo: exchange2.bid,
              bidFrom: exchange1.bid,
              askFrom: exchange1.ask,
              bidTo: exchange2.bid,
              askTo: exchange2.ask,
              priceDifference: priceDiff,
              percentageDifference: percentageDiff,
              timestamp: getJapanTime(),
              profit: priceDiff
            };
            
            opportunities.push(opportunity);
            
            if (this.db) {
              this.db.saveArbitrageOpportunity(opportunity).catch(console.error);
            }
          }
        }
        
        // Check if exchange2.ask < exchange1.bid (buy at exchange2, sell at exchange1)
        if (exchange2.ask && exchange1.bid && exchange2.ask < exchange1.bid) {
          const priceDiff = exchange1.bid - exchange2.ask;
          const percentageDiff = (priceDiff / exchange2.ask) * 100;
          
          if (percentageDiff >= this.threshold) {
            const opportunity = {
              exchangeFrom: exchange2.exchange,
              exchangeTo: exchange1.exchange,
              priceFrom: exchange2.ask,
              priceTo: exchange1.bid,
              bidFrom: exchange2.bid,
              askFrom: exchange2.ask,
              bidTo: exchange1.bid,
              askTo: exchange1.ask,
              priceDifference: priceDiff,
              percentageDifference: percentageDiff,
              timestamp: getJapanTime(),
              profit: priceDiff
            };
            
            opportunities.push(opportunity);
            
            if (this.db) {
              this.db.saveArbitrageOpportunity(opportunity).catch(console.error);
            }
          }
        }
      }
    }
    
    return opportunities.sort((a, b) => b.percentageDifference - a.percentageDifference);
  }

  formatOpportunityMessage(opportunity) {
    return `Arbitrage Opportunity: Buy at ${opportunity.exchangeFrom} (Ask: ¥${opportunity.priceFrom.toLocaleString()}) ` +
           `and sell at ${opportunity.exchangeTo} (Bid: ¥${opportunity.priceTo.toLocaleString()}) ` +
           `for ${opportunity.percentageDifference.toFixed(2)}% profit`;
  }

  calculatePotentialProfit(opportunity, amount = 1) {
    const buyValue = amount * opportunity.priceFrom;
    const sellValue = amount * opportunity.priceTo;
    return sellValue - buyValue;
  }
}

module.exports = ArbitrageDetector;