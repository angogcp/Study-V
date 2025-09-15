const { getDatabase } = require('../database/connection');

async function deleteDuplicateChapters() {
  const db = await getDatabase();
  try {
    // Find duplicate groups
    const duplicates = await new Promise((resolve, reject) => {
      db.all(`
        SELECT name, subject_id, grade_level, COUNT(*) as count, MIN(id) as min_id
        FROM chapters
        GROUP BY name, subject_id, grade_level
        HAVING count > 1
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (duplicates.length === 0) {
      console.log('No duplicates found.');
      return;
    }

    let deleted = 0;
    for (const dup of duplicates) {
      // Delete all except the min_id
      await new Promise((resolve, reject) => {
        db.run(`
          DELETE FROM chapters
          WHERE name = ? AND subject_id = ? AND grade_level = ? AND id != ?
        `, [dup.name, dup.subject_id, dup.grade_level, dup.min_id], function(err) {
          if (err) reject(err);
          else {
            deleted += this.changes;
            resolve();
          }
        });
      });
    }

    console.log(`Deleted ${deleted} duplicate chapters.`);
  } catch (error) {
    console.error('Error deleting duplicates:', error);
  } finally {
    db.close();
  }
}

deleteDuplicateChapters();