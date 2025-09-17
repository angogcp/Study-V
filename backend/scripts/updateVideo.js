const db = require('../database/connection').getDatabase();

db.run(`
  UPDATE videos 
  SET youtube_id = 'PLM6BsEOFro', 
      youtube_url = 'https://www.youtube.com/watch?v=PLM6BsEOFro' 
  WHERE id = 1
`, (err) => {
  if (err) {
    console.error('Error updating video:', err);
  } else {
    console.log('Video updated successfully');
  }
  db.close();
});