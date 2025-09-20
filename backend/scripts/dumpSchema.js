const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'learning_platform.db');
console.log('Attempting to open database at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Database opened successfully');
});

db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, rows) => {
  if (err) {
    console.error('Error querying tables:', err.message);
    return;
  }
  console.log('Found tables:', rows.map(r => r.name));

  rows.forEach(table => {
    db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
      if (err) {
        console.error(`Error getting info for ${table.name}:`, err.message);
        return;
      }
      console.log(`\nTable: ${table.name}`);
      columns.forEach(col => {
        console.log(`${col.name} (${col.type})`);
      });
    });
  });
});

setTimeout(() => db.close(), 2000);