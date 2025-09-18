const { getDatabase } = require('../database/connection');

const db = getDatabase();

db.run("UPDATE subjects SET name_chinese = '英语' WHERE id = 3", (err) => {
  if (err) {
    console.error(err);
  } else {
    console.log('Updated successfully');
  }
  db.close();
});