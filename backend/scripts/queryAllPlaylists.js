const db = require('../database/connection').getDatabase();

db.all('SELECT * FROM playlists', [], (err, rows) => {
  if (err) {
    console.error('Error querying playlists:', err);
  } else {
    if (rows.length === 0) {
      console.log('No playlists found.');
    } else {
      console.log('Playlists:');
      rows.forEach((row) => {
        console.log(`ID: ${row.id}, Name: ${row.name}, Created By: ${row.created_by}, Public: ${row.is_public}, Featured: ${row.is_featured}`);
      });
    }
  }
  db.close();
});