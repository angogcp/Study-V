const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('../learning_platform.db');

db.get("SELECT youtube_url FROM videos WHERE id = 1", (err, row) => {
  if (err) {
    console.error(err);
  } else {
    console.log(row ? row.youtube_url : 'No video found');
  }
  db.close();
});