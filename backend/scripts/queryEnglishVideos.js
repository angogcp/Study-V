const { getDatabase } = require('../database/connection');

const db = getDatabase();

db.all('SELECT id, title, grade_level, chapter FROM videos WHERE subject_id = 3', (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log(rows);
  }
  db.close();
});