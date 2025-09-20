const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '..', 'learning_platform.db');

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Database opened successfully');
});

const email = 'admin@example.com';
const password = 'admin123'; // Secure password

const hashed = bcrypt.hashSync(password, 10);

db.run(
  'UPDATE user_profiles SET password_hash = ? WHERE email = ?',
  [hashed, email],
  function(err) {
    if (err) {
      console.error('Error updating admin password:', err.message);
      db.close();
      process.exit(1);
    }
    if (this.changes === 0) {
      console.log('No admin user found to update');
    } else {
      console.log('Admin password reset successfully');
    }
    db.close();
  }
);