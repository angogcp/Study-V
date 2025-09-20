const util = require('util');
const { getDatabase } = require('../database/connection');

const db = getDatabase();
const dbGet = util.promisify(db.get.bind(db));

const adminEmail = 'admin@example.com';

async function main() {
  const adminRow = await dbGet('SELECT user_uuid FROM user_profiles WHERE email = ?', adminEmail);
  if (!adminRow) {
    console.log('Admin not found');
    process.exit(1);
  }
  const adminId = adminRow.user_uuid;

  const totalProgressRow = await dbGet('SELECT COUNT(*) as count FROM video_progress');
  console.log('Total video progress records:', totalProgressRow ? totalProgressRow.count : 'undefined');

  const totalNotesRow = await dbGet('SELECT COUNT(*) as count FROM user_notes');
  console.log('Total user notes:', totalNotesRow ? totalNotesRow.count : 'undefined');

  const totalProfilesRow = await dbGet('SELECT COUNT(*) as count FROM user_profiles');
  console.log('Total user profiles:', totalProfilesRow ? totalProfilesRow.count : 'undefined');

  const progressCountRow = await dbGet('SELECT COUNT(*) as count FROM video_progress WHERE user_id != ?', adminId);
  console.log('Non-admin video progress records:', progressCountRow ? progressCountRow.count : 'undefined');

  const notesCountRow = await dbGet('SELECT COUNT(*) as count FROM user_notes WHERE user_id != ?', adminId);
  console.log('Non-admin user notes:', notesCountRow ? notesCountRow.count : 'undefined');

  const profilesRow = await dbGet('SELECT COUNT(*) as count FROM user_profiles WHERE user_uuid != ? AND (total_watch_time > 0 OR videos_completed > 0 OR notes_count > 0)', adminId);
  console.log('Non-admin profiles with non-zero stats:', profilesRow ? profilesRow.count : 'undefined');
}

main().catch(e => {
  console.log('Error:', e.message);
  process.exit(1);
});