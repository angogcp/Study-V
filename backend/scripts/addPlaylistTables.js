// Script to add playlist tables to the database
const { getDatabase } = require('../database/connection');

function addPlaylistTables() {
  const db = getDatabase();
  
  console.log('Adding playlist tables to database...');

  // Create playlists table
  db.run(`CREATE TABLE IF NOT EXISTS playlists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_by TEXT NOT NULL,
    subject_id INTEGER,
    grade_level TEXT CHECK (grade_level IN ('初中1', '初中2', '初中3')),
    is_public BOOLEAN DEFAULT 0,
    is_featured BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(subject_id) REFERENCES subjects(id)
  )`, (err) => {
    if (err) {
      console.error('Error creating playlists table:', err);
    } else {
      console.log('Playlists table created successfully');
    }
  });

  // Create playlist_videos table (junction table for many-to-many relationship)
  db.run(`CREATE TABLE IF NOT EXISTS playlist_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id INTEGER NOT NULL,
    video_id INTEGER NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY(video_id) REFERENCES videos(id) ON DELETE CASCADE,
    UNIQUE(playlist_id, video_id)
  )`, (err) => {
    if (err) {
      console.error('Error creating playlist_videos table:', err);
    } else {
      console.log('Playlist_videos table created successfully');
    }
  });

  // Create user_playlist_progress table to track user progress through playlists
  db.run(`CREATE TABLE IF NOT EXISTS user_playlist_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    playlist_id INTEGER NOT NULL,
    current_video_index INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT 0,
    last_watched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    UNIQUE(user_id, playlist_id)
  )`, (err) => {
    if (err) {
      console.error('Error creating user_playlist_progress table:', err);
    } else {
      console.log('User_playlist_progress table created successfully');
    }
  });
}

// Run the function
addPlaylistTables();