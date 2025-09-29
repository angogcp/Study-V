const db = require('../database/connection').getDatabase();

db.all('SELECT id, youtube_id, title, youtube_url FROM videos WHERE youtube_id IS NULL OR length(youtube_id) != 11 OR youtube_id GLOB \"*[^a-zA-Z0-9_-]*\"', [], (err, rows) => {
  if (err) {
    console.error('Error querying videos:', err);
  } else {
    console.log('Invalid Videos:');
    rows.forEach((row) => {
      console.log(`ID: ${row.id}, YouTube ID: ${row.youtube_id}, Title: ${row.title}, URL: ${row.youtube_url}`);
    });
  }
  if (rows.length === 0) {
    console.log('No invalid videos found.');
  }
  db.close();
});