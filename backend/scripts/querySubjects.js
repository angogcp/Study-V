const { getDatabase } = require('../database/connection');

const db = getDatabase();

db.all('SELECT * FROM subjects', (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log(rows);
  }
  db.close();
});