const { getDatabase } = require('../database/connection');

const db = getDatabase();

console.log('Querying videos with empty or null youtube_url...');

db.all(
  `SELECT id, title, chapter, grade_level, subject_id 
   FROM videos 
   WHERE youtube_url IS NULL OR youtube_url = '' 
   ORDER BY grade_level, chapter`,
  (err, rows) => {
    if (err) {
      console.error('Error querying videos:', err);
      db.close();
      return;
    }
    
    if (rows.length === 0) {
      console.log('No videos with empty youtube_url found.');
    } else {
      console.log(`Found ${rows.length} videos with empty youtube_url:`);
      rows.forEach(row => {
        console.log(`ID: ${row.id}, Title: ${row.title}, Chapter: ${row.chapter}, Grade: ${row.grade_level}, Subject: ${row.subject_id}`);
      });
    }
    
    db.close();
  }
);