const express = require('express');
const { getDatabase } = require('../database/connection');

const router = express.Router();

// Get all videos with optional filters
router.get('/', async (req, res) => {
  const { subject_id, grade_level, chapter, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  const db = getDatabase();
  
  let query = db.from('videos')
    .select('*, subjects!inner(name: subject_name, name_chinese: subject_name_chinese, color_code: subject_color)')
    .eq('is_active', 1);
  
  if (subject_id) {
    query = query.eq('subject_id', subject_id);
  }
  
  if (grade_level) {
    query = query.eq('grade_level', grade_level);
  }
  
  if (chapter) {
    query = query.eq('chapter', chapter);
  }
  
  if (search) {
    query = query.or(`title.ilike.%${search}%,title_chinese.ilike.%${search}%,description.ilike.%${search}%,topic.ilike.%${search}%`);
  }
  
  const { data: videos, error } = await query
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) {
    return res.status(500).json({ error: 'Database error' });
  }
  
  // Get total count for pagination
  let countQuery = db.from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', 1);
  
  if (subject_id) {
    countQuery = countQuery.eq('subject_id', subject_id);
  }
  
  if (grade_level) {
    countQuery = countQuery.eq('grade_level', grade_level);
  }
  
  if (chapter) {
    countQuery = countQuery.eq('chapter', chapter);
  }
  
  if (search) {
    countQuery = countQuery.or(`title.ilike.%${search}%,title_chinese.ilike.%${search}%,description.ilike.%${search}%,topic.ilike.%${search}%`);
  }
  
  const { count: total, error: countError } = await countQuery;
  
  if (countError) {
    return res.status(500).json({ error: 'Database error' });
  }
  
  res.json({
    videos,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// Get single video by ID
router.get('/:id', async (req, res) => {
  const db = getDatabase();
  
  const { data: video, error } = await db.from('videos')
    .select('*, subjects!inner(name: subject_name, name_chinese: subject_name_chinese, color_code: subject_color)')
    .eq('id', req.params.id)
    .eq('is_active', 1)
    .single();
  
  if (error) {
    return res.status(500).json({ error: 'Database error' });
  }
  
  if (!video) {
    return res.status(404).json({ error: 'Video not found' });
  }
  
  // Increment view count
  await db.from('videos')
    .update({ view_count: video.view_count + 1 })
    .eq('id', req.params.id);
  
  res.json(video);
});

module.exports = router;