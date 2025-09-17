const db = require('../database/connection').getDatabase();

const videoId = 1;
const newYoutubeId = 'mgHO-bsCDrA';
const newYoutubeUrl = `https://www.youtube.com/watch?v=${newYoutubeId}`;

db.run(
  `UPDATE videos SET youtube_id = ?, youtube_url = ? WHERE id = ?`,
  [newYoutubeId, newYoutubeUrl, videoId],
  function (err) {
    if (err) {
      console.error('Error updating video:', err);
    } else {
      console.log(`Video with ID ${videoId} updated successfully. Rows affected: ${this.changes}`);
    }
    db.close();
  }
);