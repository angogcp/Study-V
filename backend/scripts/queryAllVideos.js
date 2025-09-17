const db = require('../database/connection').getDatabase();

db.all('SELECT id, youtube_id FROM videos', [], (err, rows) => {
  if (err) {
    console.error('Error querying videos:', err);
  } else {
    console.log('Videos:');
    rows.forEach((row) => {
      console.log(`ID: ${row.id}, YouTube ID: ${row.youtube_id}`);
    });
  }
  db.close();
});