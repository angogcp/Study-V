const util = require('util');
const { getDatabase } = require('../database/connection');

const db = getDatabase();
const dbGet = util.promisify(db.get.bind(db));
const dbRun = util.promisify(db.run.bind(db));

const adminEmail = 'admin@example.com';

async function main() {
  const adminRow = await dbGet('SELECT user_uuid FROM user_profiles WHERE email = ?', adminEmail);
  if (!adminRow) {
    console.log('Admin not found');
    process.exit(1);
  }
  const adminId = adminRow.user_uuid;

  try {
    await dbRun('DELETE FROM video_progress WHERE user_id != ?', adminId);
    console.log('Video progress cleaned');
  } catch(e) {
    console.log('Error deleting video_progress:', e.message);
  }

  try {
    await dbRun('DELETE FROM user_notes WHERE user_id != ?', adminId);
    console.log('User notes cleaned');
  } catch(e) {
    console.log('Error deleting user_notes:', e.message);
  }

  try {
    await dbRun('UPDATE user_profiles SET total_watch_time = 0, videos_completed = 0, notes_count = 0 WHERE user_uuid != ?', adminId);
    console.log('User profiles reset');
  } catch(e) {
    console.log('Error updating user_profiles:', e.message);
  }

  console.log('Student records cleaned');
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});