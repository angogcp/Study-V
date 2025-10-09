console.log('Starting initialization');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
// Remove sqlite3 and path requires, keep others
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const { getDatabase } = require('./connection');

// Remove dbPath and isVercel

// Make initializeDatabase async
async function initializeDatabase() {
  const supabase = getDatabase();
    
  console.log(`Initializing database with Supabase`);

  // Remove all CREATE TABLE db.run calls

  // Insert default subjects
  const subjects = [
    { name: 'Mathematics', name_chinese: '数学', color_code: '#10B981', sort_order: 1 },
    { name: 'Science', name_chinese: '科学', color_code: '#3B82F6', sort_order: 2 },
    { name: 'English', name_chinese: '英文', color_code: '#8B5CF6', sort_order: 3 }
  ];

  for (const subject of subjects) {
    const { error } = await supabase
      .from('subjects')
      .upsert(subject, { onConflict: 'name' });
    
    if (error) {
      console.error('Error inserting subject:', JSON.stringify(error, null, 2));
    } else {
      console.log(`Subject ${subject.name_chinese} inserted or updated`);
    }
  }

  // Create default admin user
  const adminEmail = 'admin@example.com';
  const adminPassword = 'admin123';
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);
  const adminUuid = uuidv4();

  const { data: existingAdmin } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('email', adminEmail)
    .single();

  if (!existingAdmin) {
    const { error } = await supabase
      .from('user_profiles')
      .insert({
        user_uuid: adminUuid,
        email: adminEmail,
        password_hash: hashedPassword,
        full_name: '系统管理员',
        role: 'admin'
      });

    if (error) {
      console.error('Error creating admin:', JSON.stringify(error, null, 2));
    } else {
      console.log('Admin user created');
    }
  } else {
    console.log('Admin user already exists');
  }

  // Create guest user
  const guestUuid = 'guest-user';

  const { data: existingGuest } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_uuid', guestUuid)
    .single();

  if (!existingGuest) {
    const { error } = await supabase
      .from('user_profiles')
      .insert({
        user_uuid: guestUuid,
        email: 'guest@example.com',
        password_hash: 'no-password',
        full_name: 'Guest User',
        role: 'student'
      });

    if (error) {
      console.error('Error creating guest user:', JSON.stringify(error, null, 2));
    } else {
      console.log('Guest user created successfully');
    }
  } else {
    console.log('Guest user already exists');
  }
}

module.exports = { initializeDatabase };