const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'learning_platform.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    return;
  }
  console.log('Database opened successfully');
});

db.all('SELECT id, email, full_name, role FROM user_profiles', (err, rows) => {
  if (err) {
    console.error('Error querying users:', err.message);
    db.close();
    return;
  }
  console.log('Users:');
  rows.forEach(row => {
    console.log(`${row.id}: ${row.email} - ${row.full_name} (${row.role})`);
  });
  db.close();
});