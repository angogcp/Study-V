const { getDatabase } = require('../database/connection');

async function testInsert() {
  const db = getDatabase();
  
  try {
    await new Promise((resolve) => {
      db.run(
        `INSERT OR IGNORE INTO videos (
          title, title_chinese, description, youtube_url, youtube_id,
          thumbnail_url, subject_id, grade_level, chapter, 
          difficulty_level, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          'Test Video', 'Test Video', '',
          'https://www.youtube.com/watch?v=test', 'test',
          'https://img.youtube.com/vi/test/maxresdefault.jpg',
          1, // assume subject_id 1
          '初中2',
          'Test Chapter',
          'easy',
          0
        ],
        (err) => {
          if (err) {
            console.error('Insert failed:', err.message);
          } else {
            console.log('Insert successful');
          }
          resolve();
        }
      );
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    db.close();
  }
}

testInsert();