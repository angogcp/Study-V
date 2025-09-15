const { getDatabase } = require('../database/connection');

const db = getDatabase();

console.log('Querying for duplicate chapters...');

db.all(`
  SELECT chapter, grade_level, subject_id, COUNT(*) as count 
  FROM videos 
  GROUP BY chapter, grade_level, subject_id 
  HAVING count > 1
`, [], (err, rows) => {
  if (err) {
    console.error('Query error:', err);
    db.close();
    return;
  }
  
  if (rows.length === 0) {
    console.log('No duplicate chapters found.');
  } else {
    console.log('Found duplicates:');
    rows.forEach(row => {
      console.log(`Chapter: ${row.chapter}, Grade: ${row.grade_level}, Subject: ${row.subject_id}, Count: ${row.count}`);
    });
  }
  
  db.close();
});