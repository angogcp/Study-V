const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('../learning_platform.db');

db.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
  if (err) {
    throw err;
  }
  rows.forEach((row) => {
    console.log(row.name);
  });
  db.close();
});