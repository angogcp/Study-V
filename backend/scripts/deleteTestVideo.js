const db = require('../database/connection').getDatabase();

db.run('DELETE FROM videos WHERE id = 135', function(err) {
  if (err) {
    console.error('Error deleting video:', err);
  } else {
    console.log(`Deleted video with ID 135, rows affected: ${this.changes}`);
  }
});

db.close();