const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// Use environment variable if available, otherwise use default path
const dbPath = process.env.DB_PATH 
  ? process.env.DB_PATH 
  : path.join(__dirname, '..', 'learning_platform.db');

// For Vercel serverless environment, use in-memory database
const isVercel = process.env.VERCEL === '1';

function getDatabase() {
  // Use in-memory database on Vercel
  if (isVercel) {
    console.log('Using in-memory database for Vercel environment');
    return new sqlite3.Database(':memory:', (err) => {
      if (err) {
        console.error('Error opening in-memory database:', err.message);
      }
    });
  }
  
  // Use file-based database for local development
  return new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log(`Connected to database at ${dbPath}`);
    }
  });
}

module.exports = { getDatabase };