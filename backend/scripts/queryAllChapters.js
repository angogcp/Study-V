const { getDatabase } = require('../database/connection');

async function queryAllChapters() {
  const db = await getDatabase();
  try {
    const chapters = await new Promise((resolve, reject) => {
      db.all(`
        SELECT id, name, subject_id, grade_level, sort_order
        FROM chapters
        ORDER BY name, grade_level, subject_id
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    console.log('All chapters:');
    chapters.forEach(ch => {
      console.log(`ID: ${ch.id}, Name: ${ch.name}, Subject: ${ch.subject_id}, Grade: ${ch.grade_level}, Sort: ${ch.sort_order}`);
    });
    console.log(`Total chapters: ${chapters.length}`);
  } catch (error) {
    console.error('Error querying chapters:', error);
  } finally {
    db.close();
  }
}

queryAllChapters();