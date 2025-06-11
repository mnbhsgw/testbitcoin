const axios = require('axios');

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

class ExchangeAPI {
  constructor() {
    this.exchanges = {
      bitflyer: 'https://api.bitflyer.com/v1/ticker?product_code=BTC_JPY',
      coincheck: 'https://coincheck.com/api/ticker',
      zaif: 'https://api.zaif.jp/api/1/ticker/btc_jpy',
      gmo: 'https://api.coin.z.com/public/v1/ticker?symbol=BTC_JPY',
      bitbank: 'https://public.bitbank.cc/btc_jpy/ticker',
      bitpoint: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=jpy'
    };
  }

  async getBitFlyerPrice() {
    try {
      const response = await axios.get(this.exchanges.bitflyer, { timeout: 5000 });
      return {
        exchange: 'bitFlyer',
        price: parseFloat(response.data.ltp),
        bid: parseFloat(response.data.best_bid),
        ask: parseFloat(response.data.best_ask),
        timestamp: getJapanTime()
      };
    } catch (error) {
      console.error('BitFlyer API Error:', error.message);
      return null;
    }
  }

  async getCoincheckPrice() {
    try {
      const response = await axios.get(this.exchanges.coincheck, { timeout: 5000 });
      return {
        exchange: 'Coincheck',
        price: parseFloat(response.data.last),
        bid: parseFloat(response.data.bid),
        ask: parseFloat(response.data.ask),
        timestamp: getJapanTime()
      };
    } catch (error) {
      console.error('Coincheck API Error:', error.message);
      return null;
    }
  }

  async getZaifPrice() {
    try {
      const response = await axios.get(this.exchanges.zaif, { timeout: 5000 });
      return {
        exchange: 'Zaif',
        price: parseFloat(response.data.last),
        bid: parseFloat(response.data.bid),
        ask: parseFloat(response.data.ask),
        timestamp: getJapanTime()
      };
    } catch (error) {
      console.error('Zaif API Error:', error.message);
      return null;
    }
  }

  async getGMOPrice() {
    try {
      const response = await axios.get(this.exchanges.gmo, { timeout: 5000 });
      const data = response.data.data[0]; // データは配列の最初の要素
      return {
        exchange: 'GMOコイン',
        price: parseFloat(data.last),
        bid: parseFloat(data.bid),
        ask: parseFloat(data.ask),
        timestamp: getJapanTime()
      };
    } catch (error) {
      console.error('GMO API Error:', error.message);
      return null;
    }
  }

  async getBitbankPrice() {
    try {
      const response = await axios.get(this.exchanges.bitbank, { timeout: 5000 });
      return {
        exchange: 'bitbank',
        price: parseFloat(response.data.data.last),
        bid: parseFloat(response.data.data.buy),
        ask: parseFloat(response.data.data.sell),
        timestamp: getJapanTime()
      };
    } catch (error) {
      console.error('bitbank API Error:', error.message);
      return null;
    }
  }

  async getBitPointPrice() {
    try {
      const response = await axios.get(this.exchanges.bitpoint, { timeout: 5000 });
      const price = response.data.bitcoin.jpy;
      return {
        exchange: 'BITPoint',
        price: parseFloat(price),
        bid: parseFloat(price), // CoinGecko doesn't provide bid/ask, using price as approximation
        ask: parseFloat(price),
        timestamp: getJapanTime()
      };
    } catch (error) {
      console.error('BITPoint API Error:', error.message);
      return null;
    }
  }

  async getAllPrices() {
    const promises = [
      this.getBitFlyerPrice(),
      this.getCoincheckPrice(),
      this.getZaifPrice(),
      this.getGMOPrice(),
      this.getBitbankPrice(),
      this.getBitPointPrice()
    ];

    const results = await Promise.allSettled(promises);
    const prices = results
      .filter(result => result.status === 'fulfilled' && result.value !== null)
      .map(result => result.value);

    return prices;
  }
}

module.exports = ExchangeAPI;