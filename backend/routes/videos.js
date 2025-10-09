const express = require('express');
const { getDatabase } = require('../database/connection');

const router = express.Router();

// Get all videos with optional filters
router.get('/', async (req, res) => {
  const { subject_id, grade_level, chapter, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  const supabase = getDatabase();
  
  try {
    let query = supabase
      .from('videos')
      .select('*')
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
      const searchTerm = `%${search}%`;
      query = query.or(`title.ilike.${searchTerm},title_chinese.ilike.${searchTerm},description.ilike.${searchTerm},topic.ilike.${searchTerm}`);
    }
    
    // Get videos with pagination
    const { data: videos, error } = await query
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;

    // Replace thumbnail URLs
    const modifiedVideos = videos.map(video => ({
      ...video,
      thumbnail_url: video.thumbnail_url?.replace('maxresdefault.jpg', 'hqdefault.jpg')
    }));
    
    // Get total count
    let countQuery = supabase.from('videos').select('count(*)', { count: 'exact', head: true }).eq('is_active', 1);
    
    if (subject_id) countQuery = countQuery.eq('subject_id', subject_id);
    if (grade_level) countQuery = countQuery.eq('grade_level', grade_level);
    if (chapter) countQuery = countQuery.eq('chapter', chapter);
    if (search) {
      const searchTerm = `%${search}%`;
      countQuery = countQuery.or(`title.ilike.${searchTerm},title_chinese.ilike.${searchTerm},description.ilike.${searchTerm},topic.ilike.${searchTerm}`);
    }
    
    const { count } = await countQuery;
    
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
  const supabase = getDatabase();
  
  try {
    const { data: video, error } = await supabase
      .from('videos')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_active', 1)
      .single();
    
    if (error) throw error;
    
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Replace thumbnail URL
    video.thumbnail_url = video.thumbnail_url?.replace('maxresdefault.jpg', 'hqdefault.jpg');
    
    // Increment view count
    const { error: updateError } = await supabase
      .from('videos')
      .update({ view_count: supabase.raw('view_count + 1') })
      .eq('id', req.params.id);
    
    if (updateError) throw updateError;
    
    res.json(video);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;