const { getDatabase } = require('../database/connection');

const db = getDatabase();

db.run(
  `INSERT INTO chapters (subject_id, grade_level, name, sort_order) VALUES (?, ?, ?, ?)`,
  [1, '初中1', '测试章节', 1],
  function(err) {
    if (err) {
      console.error('Insert error:', err);
    } else {
      console.log('Inserted successfully, id:', this.lastID);
    }
  }
);

db.close();