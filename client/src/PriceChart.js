import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

const PriceChart = ({ prices, ws }) => {
  const [chartData, setChartData] = useState({
    datasets: []
  });
  const [timeRange, setTimeRange] = useState(1);
  const [realtimeData, setRealtimeData] = useState({});
  const chartRef = useRef();

  const exchangeColors = {
    'bitFlyer': '#ff6b6b',
    'Coincheck': '#4ecdc4', 
    'Zaif': '#45b7d1',
    'GMOコイン': '#96ceb4',
    'bitbank': '#ffeaa7'
  };

  const fetchPriceHistory = async () => {
    try {
      const response = await axios.get(`/api/price-history?hours=${timeRange}`);
      const priceHistory = response.data.priceHistory;
      
      console.log(`Fetched ${priceHistory.length} records for ${timeRange} hours`);
      
      // データを取引所ごとにグループ化
      const groupedData = {};
      priceHistory.forEach(record => {
        if (!groupedData[record.exchange]) {
          groupedData[record.exchange] = [];
        }
        groupedData[record.exchange].push({
          x: new Date(record.timestamp),
          y: record.price
        });
      });

      // Chart.js用のデータセットを作成
      const datasets = Object.keys(groupedData).map(exchange => ({
        label: exchange,
        data: groupedData[exchange],
        borderColor: exchangeColors[exchange] || '#666',
        backgroundColor: exchangeColors[exchange] || '#666',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 1,
        pointHoverRadius: 4
      }));

      setChartData({ datasets });
      
      // チャートの再描画を強制
      if (chartRef.current) {
        chartRef.current.update('none');
      }
    } catch (error) {
      console.error('Error fetching price history:', error);
    }
  };

  // リアルタイムデータでチャートを更新
  const updateChartWithRealtime = (newPrices) => {
    if (!newPrices || newPrices.length === 0) return;
    
    const now = new Date();
    const newRealtimeData = { ...realtimeData };
    
    newPrices.forEach(price => {
      if (!newRealtimeData[price.exchange]) {
        newRealtimeData[price.exchange] = [];
      }
      
      // 最新のデータポイントを追加
      newRealtimeData[price.exchange].push({
        x: now,
        y: price.price
      });
      
      // 古いデータを削除（直近1時間分のみ保持）
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      newRealtimeData[price.exchange] = newRealtimeData[price.exchange]
        .filter(point => point.x > oneHourAgo);
    });
    
    setRealtimeData(newRealtimeData);
    
    // 現在のチャートデータにリアルタイムデータを追加
    setChartData(prevData => {
      const updatedDatasets = prevData.datasets.map(dataset => {
        const exchangeName = dataset.label;
        const realtimePoints = newRealtimeData[exchangeName] || [];
        
        // 既存のデータと新しいリアルタイムデータを結合
        const allData = [...dataset.data];
        realtimePoints.forEach(point => {
          // 重複を避けるため、同じ時刻のデータは更新
          const existingIndex = allData.findIndex(p => 
            Math.abs(p.x.getTime() - point.x.getTime()) < 5000 // 5秒以内なら同じとみなす
          );
          if (existingIndex >= 0) {
            allData[existingIndex] = point;
          } else {
            allData.push(point);
          }
        });
        
        // 時刻順にソート
        allData.sort((a, b) => a.x.getTime() - b.x.getTime());
        
        return {
          ...dataset,
          data: allData
        };
      });
      
      return { datasets: updatedDatasets };
    });
  };

  // WebSocketでリアルタイム更新を受信
  useEffect(() => {
    if (prices && prices.length > 0) {
      updateChartWithRealtime(prices);
    }
  }, [prices]);

  useEffect(() => {
    // チャートデータをリセットして強制的に再描画
    setChartData({ datasets: [] });
    setRealtimeData({});
    
    fetchPriceHistory();
    const interval = setInterval(fetchPriceHistory, 30000); // 30秒ごとに更新
    return () => clearInterval(interval);
  }, [timeRange]);

  const calculateTimeRange = () => {
    const now = new Date();
    const startTime = new Date(now.getTime() - timeRange * 60 * 60 * 1000);
    return { min: startTime, max: now };
  };

  // チャートオプションを動的に生成する関数
  const getChartOptions = () => {
    const timeRangeData = calculateTimeRange();
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: `BTC/JPY 価格推移 (過去${timeRange}時間)`
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ¥${context.parsed.y.toLocaleString()}`;
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            displayFormats: {
              hour: 'HH:mm',
              minute: 'HH:mm'
            }
          },
          title: {
            display: true,
            text: '時刻'
          },
          min: timeRangeData.min,
          max: timeRangeData.max,
          adapters: {
            date: {}
          }
        },
        y: {
          type: 'linear',
          title: {
            display: true,
            text: '価格 (JPY)'
          },
          ticks: {
            callback: function(value) {
              return '¥' + value.toLocaleString();
            }
          },
          beginAtZero: false,
          grace: '5%',
          min: undefined,
          max: undefined
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    };
  };


  return (
    <div className="price-chart">
      <div className="chart-controls">
        <div className="control-group">
          <label htmlFor="timeRange">表示期間: </label>
          <select 
            id="timeRange"
            value={timeRange} 
            onChange={(e) => setTimeRange(parseInt(e.target.value))}
          >
            <option value={0.5}>30分</option>
            <option value={1}>1時間</option>
            <option value={2}>2時間</option>
            <option value={6}>6時間</option>
            <option value={12}>12時間</option>
            <option value={24}>24時間</option>
            <option value={72}>3日間</option>
            <option value={168}>1週間</option>
          </select>
        </div>
        <div className="control-group">
          <a 
            href={`http://localhost:3001/api/export-csv?hours=${timeRange}`}
            download
            className="export-button"
          >
            📊 CSV出力
          </a>
        </div>
      </div>
      <div className="chart-container">
        <Line ref={chartRef} data={chartData} options={getChartOptions()} />
      </div>
    </div>
  );
};

export default PriceChart;