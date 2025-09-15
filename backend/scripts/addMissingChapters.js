const { getDatabase } = require('../database/connection');

async function addMissingChapters() {
  const db = await getDatabase();
  try {
    const uniqueChapters = await new Promise((resolve, reject) => {
      db.all(`
        SELECT DISTINCT chapter as name, subject_id, grade_level
        FROM videos
        WHERE chapter IS NOT NULL AND chapter != ''
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    let inserted = 0;
    for (const ch of uniqueChapters) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT OR IGNORE INTO chapters (name, subject_id, grade_level, sort_order)
          VALUES (?, ?, ?, 0)
        `, [ch.name, ch.subject_id, ch.grade_level], function(err) {
          if (err) reject(err);
          else {
            if (this.changes > 0) inserted++;
            resolve();
          }
        });
      });
    }

    console.log(`Added ${inserted} new chapters.`);
  } catch (error) {
    console.error('Error adding chapters:', error);
  } finally {
    db.close();
  }
}

addMissingChapters();