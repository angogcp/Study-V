const express = require('express');
const { getDatabase } = require('../database/connection');

const router = express.Router();

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

module.exports = router;