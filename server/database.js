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
        (exchange_from, exchange_to, price_from, price_to, price_difference, percentage_difference, timestamp) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run([
        opportunity.exchangeFrom,
        opportunity.exchangeTo,
        opportunity.priceFrom,
        opportunity.priceTo,
        opportunity.priceDifference,
        opportunity.percentageDifference,
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