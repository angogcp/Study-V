const express = require('express');
const axios = require('axios');
const { getDatabase } = require('../database/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Helper function to extract YouTube video ID from URL
function extractYouTubeId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// Helper function to get YouTube video metadata
async function getYouTubeVideoInfo(videoId) {
  try {
    // For production, you would use YouTube Data API v3
    // For now, we'll extract basic info from the URL and use defaults
    return {
      title: `Video ${videoId}`,
      description: '',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration: 0
    };
  } catch (error) {
    console.error('Error fetching YouTube info:', error);
    return {
      title: `Video ${videoId}`,
      description: '',
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration: 0
    };
  }
}

// Get all videos with optional filters
router.get('/', (req, res) => {
  const { subject_id, grade_level, chapter, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT v.*, s.name as subject_name, s.name_chinese as subject_name_chinese, s.color_code as subject_color
    FROM videos v
    JOIN subjects s ON v.subject_id = s.id
    WHERE v.is_active = 1
  `;
  let params = [];

  if (subject_id) {
    query += ` AND v.subject_id = ?`;
    params.push(subject_id);
  }

  if (grade_level) {
    query += ` AND v.grade_level = ?`;
    params.push(grade_level);
  }

  if (chapter) {
    query += ` AND v.chapter = ?`;
    params.push(chapter);
  }

  if (search) {
    query += ` AND (v.title LIKE ? OR v.title_chinese LIKE ? OR v.description LIKE ? OR v.topic LIKE ?)`;
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }

  query += ` ORDER BY v.sort_order, v.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const db = getDatabase();

  db.all(query, params, (err, videos) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM videos v WHERE v.is_active = 1`;
    let countParams = [];
    
    if (subject_id) {
      countQuery += ` AND v.subject_id = ?`;
      countParams.push(subject_id);
    }
    
    if (grade_level) {
      countQuery += ` AND v.grade_level = ?`;
      countParams.push(grade_level);
    }
    
    if (chapter) {
      countQuery += ` AND v.chapter = ?`;
      countParams.push(chapter);
    }
    
    if (search) {
      countQuery += ` AND (v.title LIKE ? OR v.title_chinese LIKE ? OR v.description LIKE ? OR v.topic LIKE ?)`;
      const searchParam = `%${search}%`;
      countParams.push(searchParam, searchParam, searchParam, searchParam);
    }

    db.get(countQuery, countParams, (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        videos,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult.total,
          pages: Math.ceil(countResult.total / limit)
        }
      });
    });
  });
});

// Get single video by ID
router.get('/:id', (req, res) => {
  const db = getDatabase();
  
  db.get(
    `SELECT v.*, s.name as subject_name, s.name_chinese as subject_name_chinese, s.color_code as subject_color
     FROM videos v
     JOIN subjects s ON v.subject_id = s.id
     WHERE v.id = ? AND v.is_active = 1`,
    [req.params.id],
    (err, video) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!video) {
        return res.status(404).json({ error: 'Video not found' });
      }
      
      // Increment view count
      db.run(`UPDATE videos SET view_count = view_count + 1 WHERE id = ?`, [req.params.id]);
      
      res.json(video);
    }
  );
});

// Add new video (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  const {
    title,
    titleChinese,
    description,
    youtubeUrl,
    subjectId,
    gradeLevel,
    chapter,
    topic,
    difficultyLevel = 'medium',
    sortOrder = 0
  } = req.body;

  if (!title || !youtubeUrl || !subjectId || !gradeLevel) {
    return res.status(400).json({ error: 'Title, YouTube URL, subject ID, and grade level are required' });
  }

  const youtubeId = extractYouTubeId(youtubeUrl);
  if (!youtubeId) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  try {
    const videoInfo = await getYouTubeVideoInfo(youtubeId);
    const db = getDatabase();

    db.run(
      `INSERT INTO videos (
        title, title_chinese, description, youtube_url, youtube_id, 
        thumbnail_url, duration, subject_id, grade_level, chapter, 
        topic, difficulty_level, sort_order, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        titleChinese || '',
        description || videoInfo.description,
        youtubeUrl,
        youtubeId,
        videoInfo.thumbnail,
        videoInfo.duration,
        subjectId,
        gradeLevel,
        chapter || '',
        topic || '',
        difficultyLevel,
        sortOrder,
        req.user.id
      ],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Video URL already exists' });
          }
          return res.status(500).json({ error: 'Failed to add video' });
        }

        res.json({
          id: this.lastID,
          message: 'Video added successfully'
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to process video' });
  }
});

// Update video (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  const {
    title,
    titleChinese,
    description,
    youtubeUrl,
    subjectId,
    gradeLevel,
    chapter,
    topic,
    difficultyLevel,
    sortOrder,
    isActive
  } = req.body;

  const videoId = req.params.id;
  const db = getDatabase();

  let youtubeId = null;
  let thumbnailUrl = null;
  
  if (youtubeUrl) {
    youtubeId = extractYouTubeId(youtubeUrl);
    if (!youtubeId) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
    const videoInfo = await getYouTubeVideoInfo(youtubeId);
    thumbnailUrl = videoInfo.thumbnail;
  }

  db.run(
    `UPDATE videos SET 
     title = COALESCE(?, title),
     title_chinese = COALESCE(?, title_chinese),
     description = COALESCE(?, description),
     youtube_url = COALESCE(?, youtube_url),
     youtube_id = COALESCE(?, youtube_id),
     thumbnail_url = COALESCE(?, thumbnail_url),
     subject_id = COALESCE(?, subject_id),
     grade_level = COALESCE(?, grade_level),
     chapter = COALESCE(?, chapter),
     topic = COALESCE(?, topic),
     difficulty_level = COALESCE(?, difficulty_level),
     sort_order = COALESCE(?, sort_order),
     is_active = COALESCE(?, is_active),
     updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      title, titleChinese, description, youtubeUrl, youtubeId, thumbnailUrl,
      subjectId, gradeLevel, chapter, topic, difficultyLevel, sortOrder, isActive, videoId
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update video' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Video not found' });
      }

      res.json({ message: 'Video updated successfully' });
    }
  );
});

// Delete video (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const db = getDatabase();

  db.run(
    `UPDATE videos SET is_active = 0 WHERE id = ?`,
    [req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete video' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Video not found' });
      }

      res.json({ message: 'Video deleted successfully' });
    }
  );
});

module.exports = router;