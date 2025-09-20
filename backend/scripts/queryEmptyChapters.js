const { getDatabase } = require('../database/connection');

const db = getDatabase();

console.log('Querying chapters with no videos...');

db.all(
  `SELECT c.id, c.name, c.subject_id, c.grade_level, s.name_chinese as subject_name
   FROM chapters c
   LEFT JOIN videos v ON c.name = v.chapter AND c.subject_id = v.subject_id AND c.grade_level = v.grade_level
   LEFT JOIN subjects s ON c.subject_id = s.id
   WHERE v.id IS NULL
   GROUP BY c.id
   ORDER BY c.grade_level, c.name`,
  (err, rows) => {
    if (err) {
      console.error('Error querying empty chapters:', err);
      db.close();
      return;
    }
    
    if (rows.length === 0) {
      console.log('No empty chapters found (all chapters have at least one video).');
    } else {
      console.log(`Found ${rows.length} empty chapters:`);
      rows.forEach(row => {
        console.log(`ID: ${row.id}, Name: ${row.name}, Grade: ${row.grade_level}, Subject: ${row.subject_name} (${row.subject_id})`);
      });
    }
    
    db.close();
  }
);