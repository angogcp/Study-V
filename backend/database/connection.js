const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// Use environment variable if available, otherwise use default path
const dbPath = process.env.DB_PATH 
  ? process.env.DB_PATH 
  : path.join(__dirname, '..', 'learning_platform.db');

// For Vercel serverless environment, use in-memory database
const isVercel = false;
console.log('isVercel value: ' + isVercel);

// Singleton database instance
let dbInstance = null;

function getDatabase() {
  if (!dbInstance) {
    if (isVercel) {
      console.log('Using in-memory database for Vercel environment');
      dbInstance = new sqlite3.Database(':memory:', (err) => {
        if (err) {
          console.error('Error opening in-memory database:', err.message);
        }
      });
    } else {
      dbInstance = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error opening database:', err.message);
        } else {
          console.log(`Connected to database at ${dbPath}`);
        }
      });
    }
  }
  return dbInstance;
}

module.exports = { getDatabase };