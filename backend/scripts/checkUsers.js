const { getDatabase } = require('../database/connection');

const checkUsers = () => {
  const db = getDatabase();
  db.get('SELECT COUNT(*) as count FROM user_profiles', (err, row) => {
    if (err) {
      console.error('Error checking users:', err.message);
      return;
    }
    console.log(`Number of users in the database: ${row.count}`);
    db.close();
  });
};

checkUsers();