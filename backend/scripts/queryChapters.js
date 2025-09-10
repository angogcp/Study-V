const { getDatabase } = require('../database/connection');

async function queryChapters() {
  const db = getDatabase();
  db.all('SELECT * FROM chapters LIMIT 10;', (err, rows) => {
    if (err) {
      console.error('Query error:', err);
    } else {
      console.log('Chapters:', rows);
    }
    db.close();
  });
}

queryChapters();