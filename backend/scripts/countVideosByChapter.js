const { getDatabase } = require('../database/connection');

async function listVideos() {
  const db = getDatabase();
  
  try {
    const rows = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM videos WHERE title = 'Test Video'", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('Videos:');
    rows.forEach(row => {
      console.log(JSON.stringify(row, null, 2));
    });
    console.log(`Total: ${rows.length}`);
  } catch (error) {
    console.error('Error querying videos:', error);
  } finally {
    db.close();
  }
}

listVideos();