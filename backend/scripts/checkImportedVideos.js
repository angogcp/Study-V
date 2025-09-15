const { getDatabase } = require('../database/connection');

const db = getDatabase();

console.log('Checking imported videos for 初中2 数学...');

// First get the subject ID for 数学
db.get('SELECT id FROM subjects WHERE name_chinese = ?', ['数学'], (err, subject) => {
  if (err) {
    console.error('Error finding subject:', err);
    db.close();
    return;
  }
  
  if (!subject) {
    console.error('Subject 数学 not found');
    db.close();
    return;
  }
  
  const subjectId = subject.id;
  console.log(`Subject ID for 数学: ${subjectId}`);
  
  // Now query videos for this subject and grade level
  db.all(
    'SELECT id, title, chapter, grade_level FROM videos WHERE subject_id = ? AND grade_level = ? ORDER BY chapter, sort_order',
    [subjectId, '初中2'],
    (err, videos) => {
      if (err) {
        console.error('Error querying videos:', err);
        db.close();
        return;
      }
      
      console.log(`Found ${videos.length} videos for 初中2 数学`);
      
      // Group videos by chapter
      const videosByChapter = {};
      videos.forEach(video => {
        if (!videosByChapter[video.chapter]) {
          videosByChapter[video.chapter] = [];
        }
        videosByChapter[video.chapter].push(video);
      });
      
      // Print videos by chapter
      console.log('\nVideos by Chapter:');
      Object.keys(videosByChapter).sort().forEach(chapter => {
        console.log(`\n${chapter} (${videosByChapter[chapter].length} videos):`);
        videosByChapter[chapter].forEach(video => {
          console.log(`  - ${video.id}: ${video.title}`);
        });
      });
      
      db.close();
    }
  );
});