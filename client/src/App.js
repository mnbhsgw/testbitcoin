import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import PriceChart from './PriceChart';

function App() {
  const [prices, setPrices] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [ws, setWs] = useState(null);

  const connectWebSocket = useCallback(() => {
    const websocket = new WebSocket('ws://localhost:3001');
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'price_update' || data.type === 'initial_data') {
        setPrices(data.prices || []);
        setOpportunities(data.opportunities || []);
        setLastUpdate(new Date().toLocaleString('ja-JP'));
      }
    };
    
    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      
      setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };
    
    setWs(websocket);
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const response = await axios.get('/api/prices');
        setPrices(response.data.prices || []);
        setOpportunities(response.data.opportunities || []);
        setLastUpdate(new Date().toLocaleString('ja-JP'));
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };

    fetchInitialData();
    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [connectWebSocket]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('ja-JP');
  };

  return (
    <div className="container">
      <div className="header">
        <h1>🪙 BTC アービトラージ監視システム</h1>
        <div className={`status ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '🟢 リアルタイム接続中' : '🔴 接続待機中...'}
        </div>
      </div>

      <div className="price-table">
        <h3>📊 現在の BTC/JPY 価格</h3>
        <table>
          <thead>
            <tr>
              <th>取引所</th>
              <th>買値 (Bid)</th>
              <th>売値 (Ask)</th>
              <th>更新時刻</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((price, index) => (
              <tr key={index}>
                <td>{price.exchange}</td>
                <td className="price bid">{price.bid ? formatPrice(price.bid) : '-'}</td>
                <td className="price ask">{price.ask ? formatPrice(price.ask) : '-'}</td>
                <td>{formatTime(price.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="chart-section">
        <h3>📈 価格チャート</h3>
        <PriceChart prices={prices} ws={ws} />
      </div>

      <div className="opportunities">
        <h3>⚡ アービトラージ機会 ({opportunities.length}件)</h3>
        {opportunities.length > 0 ? (
          opportunities.map((opp, index) => (
            <div key={index} className={`opportunity-item ${!opp.isProfitableAfterFees ? 'unprofitable' : ''}`}>
              <div className="opportunity-header">
                <div>
                  <strong>{opp.exchangeFrom}</strong> → <strong>{opp.exchangeTo}</strong>
                </div>
                <div className="percentage-group">
                  <div className="percentage gross">理論: +{opp.percentageDifference.toFixed(2)}%</div>
                  <div className={`percentage net ${opp.isProfitableAfterFees ? 'profitable' : 'unprofitable'}`}>
                    実際: {opp.netProfitPercentage > 0 ? '+' : ''}{opp.netProfitPercentage.toFixed(2)}%
                  </div>
                </div>
              </div>
              <div className="profit-info">
                買い: {formatPrice(opp.priceFrom)} (Ask) | 
                売り: {formatPrice(opp.priceTo)} (Bid) | 
                理論差額: {formatPrice(opp.priceDifference)}
              </div>
              <div className="net-profit-info">
                <span className="label">手数料考慮後（1 BTC）:</span>
                <span className={`net-profit ${opp.isProfitableAfterFees ? 'profitable' : 'unprofitable'}`}>
                  {opp.netProfit > 0 ? '+' : ''}{formatPrice(opp.netProfit)}
                </span>
                <span className="total-fees"> (手数料: {formatPrice(opp.totalFees)})</span>
              </div>
              {opp.feeBreakdown && (
                <div className="fee-breakdown">
                  <details>
                    <summary>手数料内訳</summary>
                    <div className="fee-details">
                      <div>買い取引手数料 ({opp.exchangeFrom}): {formatPrice(opp.feeBreakdown.buyExchange.tradingFee)}</div>
                      <div>売り取引手数料 ({opp.exchangeTo}): {formatPrice(opp.feeBreakdown.sellExchange.tradingFee)}</div>
                      <div>JPY出金手数料: {formatPrice(opp.feeBreakdown.sellExchange.jpyWithdrawalFee)}</div>
                      <div>BTC送金手数料: {formatPrice(opp.feeBreakdown.buyExchange.btcWithdrawalFee)}</div>
                      <div>ネットワーク手数料: {formatPrice(opp.feeBreakdown.networkFee)}</div>
                    </div>
                  </details>
                </div>
              )}
              {opp.bidFrom && opp.askFrom && opp.bidTo && opp.askTo && (
                <div className="bid-ask-info">
                  {opp.exchangeFrom}: Bid {formatPrice(opp.bidFrom)} / Ask {formatPrice(opp.askFrom)} | 
                  {opp.exchangeTo}: Bid {formatPrice(opp.bidTo)} / Ask {formatPrice(opp.askTo)}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="no-opportunities">
            現在、アービトラージ機会はありません（0.1%以上の価格差なし）
          </div>
        )}
      </div>

      {lastUpdate && (
        <div className="last-update">
          最終更新: {lastUpdate}
        </div>
      )}
    </div>
  );
}

export default App;