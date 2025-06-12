class FeeCalculator {
  constructor() {
    this.exchangeFees = {
      'bitFlyer': {
        tradingFee: {
          maker: 0.0001, // 0.01%
          taker: 0.0015  // 0.15% (varies by volume)
        },
        withdrawalFee: {
          jpy: 550,      // 三井住友銀行以外: 550円
          jpySMBC: 330,  // 三井住友銀行: 330円
          btc: 0.0004    // 0.0004 BTC
        }
      },
      'Coincheck': {
        tradingFee: {
          maker: 0.0000, // 0% (取引所)
          taker: 0.0000  // 0% (取引所)
        },
        withdrawalFee: {
          jpy: 407,      // 407円
          btc: 0.0005    // 0.0005 BTC
        }
      },
      'Zaif': {
        tradingFee: {
          maker: 0.0000, // 0% (maker)
          taker: 0.0010  // 0.1% (taker)
        },
        withdrawalFee: {
          jpy: 385,      // 385円
          btc: 0.0001    // 0.0001 BTC + mining fee
        }
      },
      'GMOコイン': {
        tradingFee: {
          maker: -0.0001, // -0.01% (マイナス手数料)
          taker: 0.0005   // 0.05%
        },
        withdrawalFee: {
          jpy: 0,        // 無料
          btc: 0         // 無料
        }
      },
      'bitbank': {
        tradingFee: {
          maker: -0.0002, // -0.02% (マイナス手数料)
          taker: 0.0012   // 0.12%
        },
        withdrawalFee: {
          jpy: 550,      // 550円
          btc: 0.0006    // 0.0006 BTC
        }
      },
      'BITPoint': {
        tradingFee: {
          maker: 0.0000, // 0%
          taker: 0.0000  // 0%
        },
        withdrawalFee: {
          jpy: 0,        // 無料
          btc: 0         // 無料
        }
      }
    };

    // Bitcoin network fee (approximate)
    this.networkFee = 0.0001; // 0.0001 BTC (約3,000-5,000円)
  }

  getTradingFee(exchange, isMaker = false) {
    const fees = this.exchangeFees[exchange];
    if (!fees) return { maker: 0.001, taker: 0.001 }; // デフォルト値
    
    return {
      maker: fees.tradingFee.maker,
      taker: fees.tradingFee.taker
    };
  }

  getWithdrawalFee(exchange, currency = 'jpy') {
    const fees = this.exchangeFees[exchange];
    if (!fees) return currency === 'jpy' ? 500 : 0.0005; // デフォルト値
    
    return fees.withdrawalFee[currency] || 0;
  }

  calculateTradingCosts(exchange, amount, price, side = 'buy', orderType = 'taker') {
    const tradingFees = this.getTradingFee(exchange);
    const feeRate = orderType === 'maker' ? tradingFees.maker : tradingFees.taker;
    
    const tradeValue = amount * price;
    const tradingFee = Math.abs(tradeValue * feeRate);
    
    return {
      tradeValue,
      feeRate,
      tradingFee,
      netValue: side === 'buy' ? tradeValue + tradingFee : tradeValue - tradingFee
    };
  }

  calculateArbitrageCosts(buyExchange, sellExchange, amount, buyPrice, sellPrice) {
    // 買い注文のコスト計算
    const buyCosts = this.calculateTradingCosts(buyExchange, amount, buyPrice, 'buy', 'taker');
    
    // 売り注文の収益計算
    const sellCosts = this.calculateTradingCosts(sellExchange, amount, sellPrice, 'sell', 'taker');
    
    // 出金手数料
    const jpyWithdrawalFee = this.getWithdrawalFee(sellExchange, 'jpy');
    const btcWithdrawalFee = this.getWithdrawalFee(buyExchange, 'btc');
    
    // 総コスト計算
    const totalBuyCost = buyCosts.netValue;
    const totalSellRevenue = sellCosts.netValue - jpyWithdrawalFee;
    const btcTransferCost = (btcWithdrawalFee + this.networkFee) * buyPrice;
    
    const grossProfit = sellPrice * amount - buyPrice * amount;
    const netProfit = totalSellRevenue - totalBuyCost - btcTransferCost;
    const profitReduction = grossProfit - netProfit;
    
    return {
      grossProfit,
      netProfit,
      profitReduction,
      totalCosts: {
        buyTradingFee: buyCosts.tradingFee,
        sellTradingFee: sellCosts.tradingFee,
        jpyWithdrawalFee,
        btcTransferCost,
        total: buyCosts.tradingFee + sellCosts.tradingFee + jpyWithdrawalFee + btcTransferCost
      },
      costBreakdown: {
        buyExchange: {
          exchange: buyExchange,
          tradingFee: buyCosts.tradingFee,
          feeRate: buyCosts.feeRate,
          btcWithdrawalFee: btcWithdrawalFee * buyPrice
        },
        sellExchange: {
          exchange: sellExchange,
          tradingFee: sellCosts.tradingFee,
          feeRate: sellCosts.feeRate,
          jpyWithdrawalFee
        },
        networkFee: this.networkFee * buyPrice
      }
    };
  }

  calculateMinimumProfitableSpread(buyExchange, sellExchange, amount = 1) {
    // 1 BTCでの最小必要スプレッドを計算
    const samplePrice = 10000000; // 1000万円と仮定
    const costs = this.calculateArbitrageCosts(buyExchange, sellExchange, amount, samplePrice, samplePrice);
    
    // 手数料を回収するために必要な最小価格差
    const minSpread = costs.totalCosts.total / amount;
    const minSpreadPercentage = (minSpread / samplePrice) * 100;
    
    return {
      minSpread,
      minSpreadPercentage,
      breakEvenSpread: minSpread * 1.1 // 10%のマージンを含む
    };
  }
}

module.exports = FeeCalculator;