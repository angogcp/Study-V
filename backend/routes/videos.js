const express = require('express');
const { getDatabase } = require('../database/connection');

const router = express.Router();

// Get all videos with optional filters
router.get('/', async (req, res) => {
  const { subject_id, grade_level, chapter, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  const db = getDatabase();
  
  try {
    // Build WHERE clause
    let whereClauses = ['v.is_active = 1'];
    let params = [];
    
    if (subject_id) {
      whereClauses.push('v.subject_id = ?');
      params.push(subject_id);
    }
    
    if (grade_level) {
      whereClauses.push('v.grade_level = ?');
      params.push(grade_level);
    }
    
    if (chapter) {
      whereClauses.push('v.chapter = ?');
      params.push(chapter);
    }
    
    if (search) {
      whereClauses.push('(LOWER(v.title) LIKE ? OR LOWER(v.title_chinese) LIKE ? OR LOWER(v.description) LIKE ? OR LOWER(v.topic) LIKE ?)');
      const searchParam = `%${search.toLowerCase()}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }
    
    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    
    // Main query
    const sql = `
      SELECT v.*, 
             s.name AS subject_name, 
             s.name_chinese AS subject_name_chinese, 
             s.color_code AS subject_color
      FROM videos v
      INNER JOIN subjects s ON v.subject_id = s.id
      ${whereSql}
      ORDER BY v.sort_order ASC, v.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const queryParams = [...params, limit, offset];
    
    const videos = await new Promise((resolve, reject) => {
      db.all(sql, queryParams, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Replace thumbnail URLs to use hqdefault instead of maxresdefault
    const modifiedVideos = videos.map(video => ({
      ...video,
      thumbnail_url: video.thumbnail_url?.replace('maxresdefault.jpg', 'hqdefault.jpg')
    }));
    
    // Count query
    const countSql = `
      SELECT COUNT(*) as count
      FROM videos v
      ${whereSql}
    `;
    
    const count = await new Promise((resolve, reject) => {
      db.get(countSql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });
    
    res.json({
      videos: modifiedVideos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get single video by ID
router.get('/:id', async (req, res) => {
  const db = getDatabase();
  
  try {
    const sql = `
      SELECT v.*, 
             s.name AS subject_name, 
             s.name_chinese AS subject_name_chinese, 
             s.color_code AS subject_color
      FROM videos v
      INNER JOIN subjects s ON v.subject_id = s.id
      WHERE v.id = ? AND v.is_active = 1
    `;
    
    const video = await new Promise((resolve, reject) => {
      db.get(sql, [req.params.id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Replace thumbnail URL to use hqdefault instead of maxresdefault
    video.thumbnail_url = video.thumbnail_url?.replace('maxresdefault.jpg', 'hqdefault.jpg');
    
    // Increment view count
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE videos SET view_count = view_count + 1 WHERE id = ?',
        [req.params.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    res.json(video);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;