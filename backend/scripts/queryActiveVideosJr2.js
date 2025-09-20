const { getDatabase } = require('../database/connection');

const db = getDatabase();

console.log('Checking active videos for 初中2...');

db.all(
  `SELECT id, title, chapter, is_active 
   FROM videos 
   WHERE grade_level = '初中2' AND is_active = 1 
   ORDER BY chapter, sort_order`,
  (err, videos) => {
    if (err) {
      console.error('Error querying videos:', err);
      db.close();
      return;
    }
    
    console.log(`Found ${videos.length} active videos for 初中2:`);
    videos.forEach(video => {
      console.log(`ID: ${video.id}, Title: ${video.title}, Chapter: ${video.chapter}, Active: ${video.is_active}`);
    });
    
    db.close();
  }
);