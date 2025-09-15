const { getDatabase } = require('../database/connection');

async function queryChapterDuplicates() {
  const db = await getDatabase();
  try {
    const duplicates = await db.all(`
      SELECT name, subject_id, grade_level, COUNT(*) as count
      FROM chapters
      GROUP BY name, subject_id, grade_level
      HAVING count > 1
      ORDER BY count DESC
    `);
    if (duplicates.length > 0) {
      console.log('Found duplicate chapter combinations:');
      duplicates.forEach(dup => {
        console.log(`${dup.name} (Grade: ${dup.grade_level}, Subject: ${dup.subject_id}) - ${dup.count} times`);
      });
    } else {
      console.log('No duplicate chapter combinations found.');
    }
  } catch (error) {
    console.error('Error querying duplicates:', error);
  } finally {
    await db.close();
  }
}

queryChapterDuplicates();