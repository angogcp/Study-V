const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/connection');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Get all playlists (public ones for students, all for admins, and own for users)
router.get('/', authenticateToken, (req, res) => {
  const db = getDatabase();
  const isUserAdmin = req.user.role === 'admin';
  
  let query = `
    SELECT p.*, s.name_chinese as subject_name, 
    COUNT(pv.video_id) as video_count
    FROM playlists p
    LEFT JOIN subjects s ON p.subject_id = s.id
    LEFT JOIN playlist_videos pv ON p.id = pv.playlist_id
  `;
  
  let params = [];
  if (!isUserAdmin) {
    query += ` WHERE (p.is_public = 1 OR p.created_by = ?)`;
    params = [req.user.id];
  }
  
  query += ` GROUP BY p.id ORDER BY p.created_at DESC`;
  
  db.all(query, params, (err, playlists) => {
    if (err) {
      console.error('Error fetching playlists:', err);
      return res.status(500).json({ error: 'Failed to fetch playlists' });
    }
    res.json(playlists);
  });
});

// Get a specific playlist with its videos
router.get('/:id', authenticateToken, (req, res) => {
  const db = getDatabase();
  const playlistId = req.params.id;
  const isUserAdmin = req.user.role === 'admin';
  
  // First get the playlist details
  let playlistQuery = `
    SELECT p.*, s.name_chinese as subject_name
    FROM playlists p
    LEFT JOIN subjects s ON p.subject_id = s.id
    WHERE p.id = ?
  `;
  
  let playlistParams = [playlistId];
  if (!isUserAdmin) {
    playlistQuery += ` AND (p.is_public = 1 OR p.created_by = ?)`;
    playlistParams.push(req.user.id);
  }
  
  db.get(playlistQuery, playlistParams, (err, playlist) => {
    if (err) {
      console.error('Error fetching playlist:', err);
      return res.status(500).json({ error: 'Failed to fetch playlist' });
    }
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    // Then get the videos in this playlist
    const videosQuery = `
      SELECT v.*, pv.sort_order
      FROM videos v
      JOIN playlist_videos pv ON v.id = pv.video_id
      WHERE pv.playlist_id = ?
      ORDER BY pv.sort_order ASC
    `;
    
    db.all(videosQuery, [playlistId], (err, videos) => {
      if (err) {
        console.error('Error fetching playlist videos:', err);
        return res.status(500).json({ error: 'Failed to fetch playlist videos' });
      }
      
      // Replace thumbnail URLs
      const modifiedVideos = videos.map(video => ({
        ...video,
        thumbnail_url: video.thumbnail_url?.replace('maxresdefault.jpg', 'hqdefault.jpg')
      }));
      
      // Return playlist with videos
      res.json({
        ...playlist,
        videos: modifiedVideos
      });
    });
  });
});

// Create a new playlist (allow authenticated users)
router.post('/', authenticateToken, (req, res) => {
  const db = getDatabase();
  const { name, description, subject_id, grade_level, is_public, is_featured } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Playlist name is required' });
  }
  
  const query = `
    INSERT INTO playlists (name, description, created_by, subject_id, grade_level, is_public, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  
  db.run(query, [
    name,
    description || '',
    req.user.id,
    subject_id || null,
    grade_level || null,
    is_public ? 1 : 0,
    is_featured ? 1 : 0
  ], function(err) {
    if (err) {
      console.error('Error creating playlist:', err);
      return res.status(500).json({ error: 'Failed to create playlist' });
    }
    
    res.status(201).json({
      id: this.lastID,
      name,
      description,
      created_by: req.user.id,
      subject_id,
      grade_level,
      is_public: is_public ? 1 : 0,
      is_featured: is_featured ? 1 : 0
    });
  });
});

// Update a playlist (admin or owner)
router.put('/:id', authenticateToken, (req, res) => {
  const db = getDatabase();
  const playlistId = req.params.id;
  const { name, description, subject_id, grade_level, is_public, is_featured } = req.body;
  const isUserAdmin = req.user.role === 'admin';
  
  if (!name) {
    return res.status(400).json({ error: 'Playlist name is required' });
  }
  
  // Check if user is authorized
  db.get('SELECT created_by FROM playlists WHERE id = ?', [playlistId], (err, playlist) => {
    if (err) {
      console.error('Error fetching playlist:', err);
      return res.status(500).json({ error: 'Failed to fetch playlist' });
    }
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    if (!isUserAdmin && playlist.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this playlist' });
    }
    
    const query = `
      UPDATE playlists
      SET name = ?, description = ?, subject_id = ?, grade_level = ?, 
          is_public = ?, is_featured = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    
    db.run(query, [
      name,
      description || '',
      subject_id || null,
      grade_level || null,
      is_public ? 1 : 0,
      is_featured ? 1 : 0,
      playlistId
    ], function(err) {
      if (err) {
        console.error('Error updating playlist:', err);
        return res.status(500).json({ error: 'Failed to update playlist' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Playlist not found' });
      }
      
      res.json({
        id: playlistId,
        name,
        description,
        subject_id,
        grade_level,
        is_public: is_public ? 1 : 0,
        is_featured: is_featured ? 1 : 0
      });
    });
  });
});

// Delete a playlist (admin or owner)
router.delete('/:id', authenticateToken, (req, res) => {
  const db = getDatabase();
  const playlistId = req.params.id;
  const isUserAdmin = req.user.role === 'admin';
  
  // Check if user is authorized
  db.get('SELECT created_by FROM playlists WHERE id = ?', [playlistId], (err, playlist) => {
    if (err) {
      console.error('Error fetching playlist:', err);
      return res.status(500).json({ error: 'Failed to fetch playlist' });
    }
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    if (!isUserAdmin && playlist.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this playlist' });
    }
    
    db.run('DELETE FROM playlists WHERE id = ?', [playlistId], function(err) {
      if (err) {
        console.error('Error deleting playlist:', err);
        return res.status(500).json({ error: 'Failed to delete playlist' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Playlist not found' });
      }
      
      res.json({ message: 'Playlist deleted successfully' });
    });
  });
});

// Add a video to a playlist (admin only)
router.post('/:id/videos', authenticateToken, isAdmin, (req, res) => {
  const db = getDatabase();
  const playlistId = req.params.id;
  const { video_id, sort_order } = req.body;
  
  if (!video_id) {
    return res.status(400).json({ error: 'Video ID is required' });
  }
  
  // First check if the playlist exists
  db.get('SELECT id FROM playlists WHERE id = ?', [playlistId], (err, playlist) => {
    if (err) {
      console.error('Error checking playlist:', err);
      return res.status(500).json({ error: 'Failed to check playlist' });
    }
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    // Then check if the video exists
    db.get('SELECT id FROM videos WHERE id = ?', [video_id], (err, video) => {
      if (err) {
        console.error('Error checking video:', err);
        return res.status(500).json({ error: 'Failed to check video' });
      }
      
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }
      
      // Get the highest sort_order in the playlist
      db.get(
        'SELECT MAX(sort_order) as max_order FROM playlist_videos WHERE playlist_id = ?',
        [playlistId],
        (err, result) => {
          if (err) {
            console.error('Error getting max sort order:', err);
            return res.status(500).json({ error: 'Failed to get max sort order' });
          }
          
          const nextSortOrder = sort_order || (result.max_order ? result.max_order + 1 : 0);
          
          // Add the video to the playlist
          db.run(
            'INSERT INTO playlist_videos (playlist_id, video_id, sort_order) VALUES (?, ?, ?)',
            [playlistId, video_id, nextSortOrder],
            function(err) {
              if (err) {
                // Check if it's a unique constraint error
                if (err.message.includes('UNIQUE constraint failed')) {
                  return res.status(400).json({ error: 'Video already in playlist' });
                }
                
                console.error('Error adding video to playlist:', err);
                return res.status(500).json({ error: 'Failed to add video to playlist' });
              }
              
              res.status(201).json({
                id: this.lastID,
                playlist_id: playlistId,
                video_id: video_id,
                sort_order: nextSortOrder
              });
            }
          );
        }
      );
    });
  });
});

// Remove a video from a playlist (admin only)
router.delete('/:id/videos/:videoId', authenticateToken, isAdmin, (req, res) => {
  const db = getDatabase();
  const playlistId = req.params.id;
  const videoId = req.params.videoId;
  
  db.run(
    'DELETE FROM playlist_videos WHERE playlist_id = ? AND video_id = ?',
    [playlistId, videoId],
    function(err) {
      if (err) {
        console.error('Error removing video from playlist:', err);
        return res.status(500).json({ error: 'Failed to remove video from playlist' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Video not found in playlist' });
      }
      
      res.json({ message: 'Video removed from playlist successfully' });
    }
  );
});

// Update video order in playlist (admin only)
router.put('/:id/videos/:videoId/order', authenticateToken, isAdmin, (req, res) => {
  const db = getDatabase();
  const playlistId = req.params.id;
  const videoId = req.params.videoId;
  const { sort_order } = req.body;
  
  if (sort_order === undefined) {
    return res.status(400).json({ error: 'Sort order is required' });
  }
  
  db.run(
    'UPDATE playlist_videos SET sort_order = ? WHERE playlist_id = ? AND video_id = ?',
    [sort_order, playlistId, videoId],
    function(err) {
      if (err) {
        console.error('Error updating video order:', err);
        return res.status(500).json({ error: 'Failed to update video order' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Video not found in playlist' });
      }
      
      res.json({
        playlist_id: playlistId,
        video_id: videoId,
        sort_order: sort_order
      });
    }
  );
});

// Get videos in a playlist
router.get('/:id/videos', authenticateToken, (req, res) => {
  const db = getDatabase();
  const playlistId = req.params.id;
  const isUserAdmin = req.user.role === 'admin';
  
  // First check if playlist exists and user has access
  let query = 'SELECT * FROM playlists WHERE id = ?';
  if (!isUserAdmin) {
    query += ' AND is_public = 1';
  }
  
  db.get(query, [playlistId], (err, playlist) => {
    if (err || !playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    // Get videos
    const videosQuery = `
      SELECT pv.id, pv.playlist_id, pv.video_id, pv.sort_order as "order",
             v.* 
      FROM playlist_videos pv
      JOIN videos v ON pv.video_id = v.id
      WHERE pv.playlist_id = ?
      ORDER BY pv.sort_order ASC
    `;
    
    db.all(videosQuery, [playlistId], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch videos' });
      }
      
      // Replace thumbnail URLs
      const modifiedRows = rows.map(row => ({
        ...row,
        thumbnail_url: row.thumbnail_url?.replace('maxresdefault.jpg', 'hqdefault.jpg')
      }));
      
      res.json(modifiedRows);
    });
  });
});
// Get user progress for videos in a playlist
router.get('/:id/progress', authenticateToken, (req, res) => {
  const db = getDatabase();
  const playlistId = req.params.id;
  const userId = req.user.id;
  
  const query = `
    SELECT pv.video_id, vp.is_completed, vp.last_watched_at
    FROM playlist_videos pv
    LEFT JOIN video_progress vp ON pv.video_id = vp.video_id AND vp.user_id = ?
    WHERE pv.playlist_id = ?
    ORDER BY pv.sort_order
  `;
  
  db.all(query, [userId, playlistId], (err, rows) => {
    if (err) {
      console.error('Error fetching playlist video progress:', err);
      return res.status(500).json({ error: 'Failed to fetch playlist progress' });
    }
    
    const progress = rows.map(row => ({
      playlist_id: playlistId,
      video_id: row.video_id,
      completed: !!row.is_completed,
      last_watched: row.last_watched_at || null
    }));
    
    res.json(progress);
  });
});

// Mark a video as completed in the playlist
router.post('/:id/progress', authenticateToken, (req, res) => {
  const db = getDatabase();
  const playlistId = req.params.id;
  const userId = req.user.id;
  const { video_id, completed } = req.body;

  if (!video_id) {
    return res.status(400).json({ error: 'video_id is required' });
  }

  // Get the video duration and check if in playlist
  db.get(
    `SELECT v.duration
     FROM videos v
     JOIN playlist_videos pv ON v.id = pv.video_id
     WHERE pv.playlist_id = ? AND v.id = ?`,
    [playlistId, video_id],
    (err, video) => {
      if (err) {
        console.error('Error fetching video:', err);
        return res.status(500).json({ error: 'Failed to fetch video' });
      }

      if (!video) {
        return res.status(404).json({ error: 'Video not found in playlist' });
      }

      const isCompleted = completed ? 1 : 0;
      const watchTime = completed ? video.duration : 0;
      const progressPercent = completed ? 100 : 0;
      const now = new Date().toISOString();

      // Upsert video progress
      db.run(
        `INSERT INTO video_progress (user_id, video_id, watch_time_seconds, total_duration, progress_percentage, is_completed, last_position, last_watched_at, completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, video_id) DO UPDATE SET
           watch_time_seconds = excluded.watch_time_seconds,
           total_duration = excluded.total_duration,
           progress_percentage = excluded.progress_percentage,
           is_completed = excluded.is_completed,
           last_position = excluded.last_position,
           last_watched_at = excluded.last_watched_at,
           completed_at = excluded.completed_at`,
        [userId, video_id, watchTime, video.duration, progressPercent, isCompleted, watchTime, now, completed ? now : null],
        (err) => {
          if (err) {
            console.error('Error updating video progress:', err);
            return res.status(500).json({ error: 'Failed to update progress' });
          }

          res.json({ message: 'Progress updated successfully' });
        }
      );
    }
  );
});

module.exports = router;