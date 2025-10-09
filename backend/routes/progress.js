const express = require('express');
const { getDatabase } = require('../database/connection');
const router = express.Router();

// Add middleware to handle guest user for routes that require authentication
router.use((req, res, next) => {
  // If no user is authenticated, create a guest user
  if (!req.user) {
    req.user = {
      id: 'guest-user',
      email: 'guest@example.com',
      full_name: 'Guest User',
      role: 'student',
      grade_level: '初中1'
    };
  }
  next();
});

// Get user's progress for a specific video
router.get('/video/:videoId', async (req, res) => {
  const supabase = getDatabase();
  
  try {
    const { data: progress, error } = await supabase
      .from('video_progress')
      .select('*')
      .eq('user_id', req.user.id)
      .eq('video_id', req.params.videoId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // Ignore not found error
    
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all user's video progress with optional filters
router.get('/', async (req, res) => {
  const { completed, subject_id, grade_level, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  const supabase = getDatabase();
  
  try {
    let query = supabase
      .from('video_progress')
      .select('*, videos!video_progress_video_id_fkey(title, title_chinese, thumbnail_url, duration, subjects(name:subject_name, name_chinese:subject_name_chinese))')
      .eq('user_id', req.user.id);
    
    if (completed !== undefined) {
      query = query.eq('is_completed', completed === 'true');
    }
    
    if (subject_id) {
      query = query.eq('videos.subject_id', subject_id);
    }
    
    if (grade_level) {
      query = query.eq('videos.grade_level', grade_level);
    }
    
    const { data: progressList, error } = await query
      .order('last_watched_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    // Get total count
    let countQuery = supabase
      .from('video_progress')
      .select('count(*)', { count: 'exact', head: true })
      .eq('user_id', req.user.id);
    
    if (completed !== undefined) countQuery = countQuery.eq('is_completed', completed === 'true');
    if (subject_id) countQuery = countQuery.eq('videos.subject_id', subject_id);
    if (grade_level) countQuery = countQuery.eq('videos.grade_level', grade_level);
    
    const { count } = await countQuery;
    
    res.json({
      progress: progressList,
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

// Update video progress
router.post('/update', async (req, res) => {
  if (req.user.role === 'guest') {
    return res.status(403).json({ message: 'Guest users cannot update progress' });
  }
  
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
  const isCompleted = progressPercentage >= 90;

  const supabase = getDatabase();
  
  try {
    // Check if exists
    const { data: existing, error: checkError } = await supabase
      .from('video_progress')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('video_id', videoId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') throw checkError;
    
    const now = new Date().toISOString();
    
    if (existing) {
      // Update
      const updates = {
        watch_time_seconds: watchTimeSeconds,
        total_duration: totalDuration ?? supabase.raw('total_duration'),
        progress_percentage: progressPercentage,
        is_completed: isCompleted,
        last_position: lastPosition ?? supabase.raw('last_position'),
        bookmark_notes: bookmarkNotes ?? supabase.raw('bookmark_notes'),
        last_watched_at: now,
        completed_at: isCompleted && !existing.completed_at ? now : supabase.raw('completed_at')
      };
      
      const { error: updateError } = await supabase
        .from('video_progress')
        .update(updates)
        .eq('user_id', req.user.id)
        .eq('video_id', videoId);
      
      if (updateError) throw updateError;
      
      if (isCompleted) {
        await updateUserStats(req.user.id, supabase);
      }
      
      res.json({ message: 'Progress updated successfully' });
    } else {
      // Insert
      const { error: insertError } = await supabase
        .from('video_progress')
        .insert({
          user_id: req.user.id,
          video_id: videoId,
          watch_time_seconds: watchTimeSeconds,
          total_duration: totalDuration || 0,
          progress_percentage: progressPercentage,
          is_completed: isCompleted,
          last_position: lastPosition || 0,
          bookmark_notes: bookmarkNotes || null,
          first_watched_at: now,
          last_watched_at: now,
          completed_at: isCompleted ? now : null
        });
      
      if (insertError) throw insertError;
      
      await updateUserStats(req.user.id, supabase);
      
      res.json({ message: 'Progress recorded successfully' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Helper function to update user statistics
async function updateUserStats(userId, supabase) {
  try {
    const { data: stats, error } = await supabase
      .from('video_progress')
      .select('watch_time_seconds, is_completed')
      .eq('user_id', userId);
    
    if (error) throw error;
    
    const totalWatchTime = stats.reduce((sum, p) => sum + p.watch_time_seconds, 0);
    const videosCompleted = stats.filter(p => p.is_completed).length;
    
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        total_watch_time: totalWatchTime,
        videos_completed: videosCompleted,
        updated_at: new Date().toISOString()
      })
      .eq('user_uuid', userId);
    
    if (updateError) throw updateError;
  } catch (error) {
    console.error('Failed to update user statistics:', error);
  }
}

// Get user learning statistics
router.get('/stats', async (req, res) => {
  const supabase = getDatabase();
  
  try {
    // Overall stats
    const { data: overallData, error: overallError } = await supabase
      .from('video_progress')
      .select('watch_time_seconds, progress_percentage, is_completed')
      .eq('user_id', req.user.id);
    
    if (overallError) throw overallError;
    
    const overallStats = {
      total_videos_watched: overallData.length,
      total_completed: overallData.filter(p => p.is_completed).length,
      total_watch_time: overallData.reduce((sum, p) => sum + p.watch_time_seconds, 0),
      average_progress: overallData.length > 0 ? overallData.reduce((sum, p) => sum + p.progress_percentage, 0) / overallData.length : 0
    };
    
    // Progress by subject
    const { data: subjectStats, error: subjectError } = await supabase
      .from('video_progress')
      .select('videos.subjects(name_chinese:subject_name, color_code), progress_percentage, is_completed')
      .eq('user_id', req.user.id);
    
    if (subjectError) throw subjectError;
    
    const bySubject = subjectStats.reduce((acc, item) => {
      const subject = item.videos.subjects.subject_name;
      if (!acc[subject]) {
        acc[subject] = {
          subject_name: subject,
          color_code: item.videos.subjects.color_code,
          videos_watched: 0,
          completed_count: 0,
          avg_progress: 0
        };
      }
      acc[subject].videos_watched++;
      acc[subject].completed_count += item.is_completed ? 1 : 0;
      acc[subject].avg_progress = (acc[subject].avg_progress * (acc[subject].videos_watched - 1) + item.progress_percentage) / acc[subject].videos_watched;
      return acc;
    }, {});
    
    // Recent activity
    const { data: recentActivity, error: recentError } = await supabase
      .from('video_progress')
      .select('videos(title, title_chinese, thumbnail_url, subjects(name_chinese:subject_name)), progress_percentage, is_completed, last_watched_at')
      .eq('user_id', req.user.id)
      .order('last_watched_at', { ascending: false })
      .limit(10);
    
    if (recentError) throw recentError;
    
    res.json({
      overall: overallStats,
      bySubject: Object.values(bySubject),
      recentActivity
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;