const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    const dbPath = path.join(__dirname, 'arbitrage.db');
    this.db = new sqlite3.Database(dbPath);
    this.init();
  }

  init() {
    this.db.serialize(() => {
      this.db.run(`
        CREATE TABLE IF NOT EXISTS price_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          exchange TEXT NOT NULL,
          price REAL NOT NULL,
          bid REAL,
          ask REAL,
          timestamp TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      this.db.run(`
        CREATE TABLE IF NOT EXISTS arbitrage_opportunities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          exchange_from TEXT NOT NULL,
          exchange_to TEXT NOT NULL,
          price_from REAL NOT NULL,
          price_to REAL NOT NULL,
          price_difference REAL NOT NULL,
          percentage_difference REAL NOT NULL,
          net_profit REAL,
          net_profit_percentage REAL,
          total_fees REAL,
          is_profitable_after_fees BOOLEAN,
          timestamp TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Migration: Add bid/ask columns if they don't exist
      this.db.all("PRAGMA table_info(price_history)", (err, columns) => {
        if (err) {
          console.error('Error checking table info:', err);
          return;
        }
        
        const hasBid = columns.some(col => col.name === 'bid');
        const hasAsk = columns.some(col => col.name === 'ask');
        
        if (!hasBid) {
          this.db.run("ALTER TABLE price_history ADD COLUMN bid REAL", (err) => {
            if (err) console.error('Error adding bid column:', err);
            else console.log('Added bid column to price_history table');
          });
        }
        
        if (!hasAsk) {
          this.db.run("ALTER TABLE price_history ADD COLUMN ask REAL", (err) => {
            if (err) console.error('Error adding ask column:', err);
            else console.log('Added ask column to price_history table');
          });
        }
      });

      // Migration: Add fee-related columns to arbitrage_opportunities if they don't exist
      this.db.all("PRAGMA table_info(arbitrage_opportunities)", (err, columns) => {
        if (err) {
          console.error('Error checking arbitrage_opportunities table info:', err);
          return;
        }
        
        const hasNetProfit = columns.some(col => col.name === 'net_profit');
        const hasNetProfitPercentage = columns.some(col => col.name === 'net_profit_percentage');
        const hasTotalFees = columns.some(col => col.name === 'total_fees');
        const hasProfitableFlag = columns.some(col => col.name === 'is_profitable_after_fees');
        
        if (!hasNetProfit) {
          this.db.run("ALTER TABLE arbitrage_opportunities ADD COLUMN net_profit REAL", (err) => {
            if (err) console.error('Error adding net_profit column:', err);
            else console.log('Added net_profit column to arbitrage_opportunities table');
          });
        }
        
        if (!hasNetProfitPercentage) {
          this.db.run("ALTER TABLE arbitrage_opportunities ADD COLUMN net_profit_percentage REAL", (err) => {
            if (err) console.error('Error adding net_profit_percentage column:', err);
            else console.log('Added net_profit_percentage column to arbitrage_opportunities table');
          });
        }

        if (!hasTotalFees) {
          this.db.run("ALTER TABLE arbitrage_opportunities ADD COLUMN total_fees REAL", (err) => {
            if (err) console.error('Error adding total_fees column:', err);
            else console.log('Added total_fees column to arbitrage_opportunities table');
          });
        }

        if (!hasProfitableFlag) {
          this.db.run("ALTER TABLE arbitrage_opportunities ADD COLUMN is_profitable_after_fees BOOLEAN", (err) => {
            if (err) console.error('Error adding is_profitable_after_fees column:', err);
            else console.log('Added is_profitable_after_fees column to arbitrage_opportunities table');
          });
        }
      });
    });
  }

  savePrices(prices) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare("INSERT INTO price_history (exchange, price, bid, ask, timestamp) VALUES (?, ?, ?, ?, ?)");
      
      for (const price of prices) {
        stmt.run([price.exchange, price.price, price.bid, price.ask, price.timestamp]);
      }
      
      stmt.finalize((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  saveArbitrageOpportunity(opportunity) {
    return new Promise((resolve, reject) => {
      const stmt = this.db.prepare(`
        INSERT INTO arbitrage_opportunities 
        (exchange_from, exchange_to, price_from, price_to, price_difference, percentage_difference, 
         net_profit, net_profit_percentage, total_fees, is_profitable_after_fees, timestamp) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        opportunity.exchangeFrom,
        opportunity.exchangeTo,
        opportunity.priceFrom,
        opportunity.priceTo,
        opportunity.priceDifference,
        opportunity.percentageDifference,
        opportunity.netProfit || null,
        opportunity.netProfitPercentage || null,
        opportunity.totalFees || null,
        opportunity.isProfitableAfterFees || false,
        opportunity.timestamp
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
      
      stmt.finalize();
    });
  }

  getRecentPrices(limit = 100) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM price_history ORDER BY created_at DESC LIMIT ?",
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  getArbitrageHistory(limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM arbitrage_opportunities ORDER BY created_at DESC LIMIT ?",
        [limit],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  getPriceHistory(hours = 24) {
    return new Promise((resolve, reject) => {
      const hoursAgo = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      this.db.all(
        `SELECT exchange, price, bid, ask, timestamp, created_at 
         FROM price_history 
         WHERE created_at >= ? 
         ORDER BY created_at ASC`,
        [hoursAgo],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  clearAllData() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run("DELETE FROM price_history", (err) => {
          if (err) {
            console.error('Error clearing price_history:', err);
            reject(err);
            return;
          }
          console.log('Cleared price_history table');
        });
        
        this.db.run("DELETE FROM arbitrage_opportunities", (err) => {
          if (err) {
            console.error('Error clearing arbitrage_opportunities:', err);
            reject(err);
            return;
          }
          console.log('Cleared arbitrage_opportunities table');
          resolve();
        });
      });
    });
  }

  close() {
    this.db.close();
  }
}

module.exports = Database;