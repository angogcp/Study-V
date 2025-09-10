const express = require('express');
const { getDatabase } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user's progress for a specific video
router.get('/video/:videoId', authenticateToken, (req, res) => {
  const db = getDatabase();
  
  db.get(
    `SELECT * FROM video_progress WHERE user_id = ? AND video_id = ?`,
    [req.user.id, req.params.videoId],
    (err, progress) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!progress) {
        return res.json({
          userId: req.user.id,
          videoId: parseInt(req.params.videoId),
          watchTimeSeconds: 0,
          progressPercentage: 0,
          isCompleted: false,
          lastPosition: 0
        });
      }
      
      res.json(progress);
    }
  );
  
  db.close();
});

// Get all user's video progress with optional filters
router.get('/', authenticateToken, (req, res) => {
  const { completed, subject_id, grade_level, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT vp.*, v.title, v.title_chinese, v.thumbnail_url, v.duration, 
           s.name as subject_name, s.name_chinese as subject_name_chinese
    FROM video_progress vp
    JOIN videos v ON vp.video_id = v.id
    JOIN subjects s ON v.subject_id = s.id
    WHERE vp.user_id = ?
  `;
  let params = [req.user.id];

  if (completed !== undefined) {
    query += ` AND vp.is_completed = ?`;
    params.push(completed === 'true' ? 1 : 0);
  }

  if (subject_id) {
    query += ` AND v.subject_id = ?`;
    params.push(subject_id);
  }

  if (grade_level) {
    query += ` AND v.grade_level = ?`;
    params.push(grade_level);
  }

  query += ` ORDER BY vp.last_watched_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const db = getDatabase();

  db.all(query, params, (err, progressList) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.json({
      progress: progressList,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  });

  db.close();
});

// Update video progress
router.post('/update', authenticateToken, (req, res) => {
  const {
    videoId,
    watchTimeSeconds,
    totalDuration,
    lastPosition,
    bookmarkNotes
  } = req.body;

  if (!videoId) {
    return res.status(400).json({ error: 'Video ID is required' });
  }

  const progressPercentage = totalDuration > 0 ? (watchTimeSeconds / totalDuration) * 100 : 0;
  const isCompleted = progressPercentage >= 90; // Consider 90% as completed

  const db = getDatabase();

  // First check if progress record exists
  db.get(
    `SELECT id FROM video_progress WHERE user_id = ? AND video_id = ?`,
    [req.user.id, videoId],
    (err, existing) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      const now = new Date().toISOString();

      if (existing) {
        // Update existing record
        db.run(
          `UPDATE video_progress SET 
           watch_time_seconds = ?,
           total_duration = COALESCE(?, total_duration),
           progress_percentage = ?,
           is_completed = ?,
           last_position = COALESCE(?, last_position),
           bookmark_notes = COALESCE(?, bookmark_notes),
           last_watched_at = ?,
           completed_at = CASE WHEN ? = 1 AND completed_at IS NULL THEN ? ELSE completed_at END
           WHERE user_id = ? AND video_id = ?`,
          [
            watchTimeSeconds,
            totalDuration,
            progressPercentage,
            isCompleted ? 1 : 0,
            lastPosition,
            bookmarkNotes,
            now,
            isCompleted ? 1 : 0,
            now,
            req.user.id,
            videoId
          ],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to update progress' });
            }

            // Update user statistics if video was just completed
            if (isCompleted) {
              updateUserStats(req.user.id);
            }

            res.json({ message: 'Progress updated successfully' });
          }
        );
      } else {
        // Create new record
        db.run(
          `INSERT INTO video_progress (
            user_id, video_id, watch_time_seconds, total_duration, 
            progress_percentage, is_completed, last_position, bookmark_notes,
            first_watched_at, last_watched_at, completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.user.id,
            videoId,
            watchTimeSeconds,
            totalDuration || 0,
            progressPercentage,
            isCompleted ? 1 : 0,
            lastPosition || 0,
            bookmarkNotes || null,
            now,
            now,
            isCompleted ? now : null
          ],
          function(err) {
            if (err) {
              return res.status(500).json({ error: 'Failed to create progress record' });
            }

            // Update user statistics
            updateUserStats(req.user.id);

            res.json({ message: 'Progress recorded successfully' });
          }
        );
      }
    }
  );

  db.close();
});

// Helper function to update user statistics
function updateUserStats(userId) {
  const db = getDatabase();
  
  // Update total watch time and completed videos count
  db.run(
    `UPDATE user_profiles SET 
     total_watch_time = (
       SELECT COALESCE(SUM(watch_time_seconds), 0) 
       FROM video_progress 
       WHERE user_id = ?
     ),
     videos_completed = (
       SELECT COUNT(*) 
       FROM video_progress 
       WHERE user_id = ? AND is_completed = 1
     ),
     updated_at = CURRENT_TIMESTAMP
     WHERE user_uuid = ?`,
    [userId, userId, userId],
    (err) => {
      if (err) {
        console.error('Failed to update user statistics:', err);
      }
    }
  );
  
  db.close();
}

// Get user learning statistics
router.get('/stats', authenticateToken, (req, res) => {
  const db = getDatabase();
  
  const queries = [
    // Overall stats
    `SELECT 
       COUNT(*) as total_videos_watched,
       COUNT(CASE WHEN is_completed = 1 THEN 1 END) as total_completed,
       COALESCE(SUM(watch_time_seconds), 0) as total_watch_time,
       COALESCE(AVG(progress_percentage), 0) as average_progress
     FROM video_progress WHERE user_id = ?`,
    
    // Progress by subject
    `SELECT 
       s.name_chinese as subject_name,
       s.color_code,
       COUNT(*) as videos_watched,
       COUNT(CASE WHEN vp.is_completed = 1 THEN 1 END) as completed_count,
       COALESCE(AVG(vp.progress_percentage), 0) as avg_progress
     FROM video_progress vp
     JOIN videos v ON vp.video_id = v.id
     JOIN subjects s ON v.subject_id = s.id
     WHERE vp.user_id = ?
     GROUP BY s.id, s.name_chinese, s.color_code`,
    
    // Recent activity
    `SELECT 
       v.title, v.title_chinese, v.thumbnail_url,
       s.name_chinese as subject_name,
       vp.progress_percentage, vp.is_completed, vp.last_watched_at
     FROM video_progress vp
     JOIN videos v ON vp.video_id = v.id
     JOIN subjects s ON v.subject_id = s.id
     WHERE vp.user_id = ?
     ORDER BY vp.last_watched_at DESC
     LIMIT 10`
  ];
  
  const results = {};
  
  // Overall stats
  db.get(queries[0], [req.user.id], (err, overallStats) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    results.overall = overallStats;
    
    // Progress by subject
    db.all(queries[1], [req.user.id], (err, subjectStats) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      results.bySubject = subjectStats;
      
      // Recent activity
      db.all(queries[2], [req.user.id], (err, recentActivity) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        
        results.recentActivity = recentActivity;
        res.json(results);
      });
    });
  });
  
  db.close();
});

module.exports = router;