console.log('Starting initialization');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '..', 'learning_platform.db');

// Initialize database and create tables
function initializeDatabase() {
  const db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    // Create user_profiles table
    db.run(`CREATE TABLE IF NOT EXISTS user_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_uuid TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
      grade_level TEXT CHECK (grade_level IN ('初中1', '初中2', '初中3')) DEFAULT '初中1',
      avatar_url TEXT,
      total_watch_time INTEGER DEFAULT 0,
      videos_completed INTEGER DEFAULT 0,
      notes_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create subjects table
    db.run(`CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      name_chinese TEXT NOT NULL UNIQUE,
      description TEXT,
      icon_url TEXT,
      color_code TEXT DEFAULT '#3B82F6',
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create chapters table
    db.run(`CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      grade_level TEXT NOT NULL CHECK (grade_level IN ('初中1', '初中2', '初中3')),
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      FOREIGN KEY(subject_id) REFERENCES subjects(id)
    )`);

    // Create videos table
    db.run(`CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      title_chinese TEXT,
      description TEXT,
      youtube_url TEXT NOT NULL UNIQUE,
      youtube_id TEXT NOT NULL,
      thumbnail_url TEXT,
      duration INTEGER DEFAULT 0,
      subject_id INTEGER NOT NULL,
      grade_level TEXT NOT NULL CHECK (grade_level IN ('初中1', '初中2', '初中3')),
      chapter TEXT,
      topic TEXT,
      difficulty_level TEXT DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      view_count INTEGER DEFAULT 0,
      created_by TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create video_progress table
    db.run(`CREATE TABLE IF NOT EXISTS video_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      video_id INTEGER NOT NULL,
      watch_time_seconds INTEGER DEFAULT 0,
      total_duration INTEGER DEFAULT 0,
      progress_percentage REAL DEFAULT 0.00,
      is_completed BOOLEAN DEFAULT 0,
      last_position INTEGER DEFAULT 0,
      bookmark_notes TEXT,
      first_watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      UNIQUE(user_id, video_id)
    )`);

    // Create user_notes table
    db.run(`CREATE TABLE IF NOT EXISTS user_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      video_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT 'Untitled Note',
      content TEXT NOT NULL,
      content_html TEXT,
      timestamp_seconds INTEGER DEFAULT 0,
      is_private BOOLEAN DEFAULT 1,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Insert default subjects
    const subjects = [
      { name: 'Mathematics', name_chinese: '数学', color_code: '#10B981', sort_order: 1 },
      { name: 'Science', name_chinese: '科学', color_code: '#3B82F6', sort_order: 2 },
      { name: 'English', name_chinese: '英文', color_code: '#8B5CF6', sort_order: 3 }
    ];

    const insertSubject = db.prepare(`INSERT OR IGNORE INTO subjects (name, name_chinese, color_code, sort_order) VALUES (?, ?, ?, ?)`);
    subjects.forEach(subject => {
      insertSubject.run(subject.name, subject.name_chinese, subject.color_code, subject.sort_order);
    });
    insertSubject.finalize();

    // Create default admin user
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    const adminUuid = uuidv4();

    db.run(`INSERT OR IGNORE INTO user_profiles (user_uuid, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, ?)`,
      [adminUuid, adminEmail, hashedPassword, '系统管理员', 'admin']);

    console.log('Database initialized successfully!');
    console.log(`Default admin account: ${adminEmail} / ${adminPassword}`);
  });

  db.close();
}

console.log('Starting initialization');
module.exports = { initializeDatabase, dbPath };
initializeDatabase();