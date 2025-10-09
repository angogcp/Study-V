const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/connection');
const { authenticateToken, isAdmin } = require('../middleware/auth');


// Get all playlists (public ones for students, all for admins, and own for users)
router.get('/', authenticateToken, async (req, res) => {
  const supabase = getDatabase();
  const isUserAdmin = req.user.role === 'admin';
  
  try {
    let query = supabase
      .from('playlists')
      .select('*, subjects(subject_name:name_chinese), playlist_videos(count)', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (!isUserAdmin) {
      query = query.or(`is_public.eq.true,created_by.eq.${req.user.id}`);
    }

    const { data: playlists, error } = await query;

    if (error) throw error;

    const modifiedPlaylists = playlists.map(p => ({
      ...p,
      subject_name: p.subject_name || null,
      video_count: p.playlist_videos?.count || 0
    }));

    res.json(modifiedPlaylists);
  } catch (error) {
    console.error('Error fetching playlists:', error);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
});


// Get a specific playlist with its videos
router.get('/:id', authenticateToken, async (req, res) => {
  const supabase = getDatabase();
  const playlistId = req.params.id;
  const isUserAdmin = req.user.role === 'admin';
  
  try {
    // First get the playlist details
    let playlistQuery = supabase
      .from('playlists')
      .select('*, subjects(subject_name:name_chinese)')
      .eq('id', playlistId);

    if (!isUserAdmin) {
      playlistQuery = playlistQuery.or(`is_public.eq.true,created_by.eq.${req.user.id}`);
    }

    const { data: playlist, error: playlistError } = await playlistQuery.single();

    if (playlistError) throw playlistError;
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    
    // Then get the videos in this playlist
    const { data: videos, error: videosError } = await supabase
      .from('playlist_videos')
      .select('*, videos(*)')
      .eq('playlist_id', playlistId)
      .order('sort_order', { ascending: true });

    if (videosError) throw videosError;
      
    // Replace thumbnail URLs and format
    const modifiedVideos = videos.map(pv => ({
      ...pv.videos,
      sort_order: pv.sort_order,
      thumbnail_url: pv.videos.thumbnail_url?.replace('maxresdefault.jpg', 'hqdefault.jpg')
    }));
      
    // Return playlist with videos
    res.json({
      ...playlist,
      videos: modifiedVideos
    });
  } catch (error) {
    console.error('Error fetching playlist:', error);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});


// Create a new playlist (allow authenticated users)
router.post('/', authenticateToken, async (req, res) => {
  const { name, description, subject_id, grade_level, is_public, is_featured } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Playlist name is required' });
  }
  
  try {
    const supabase = getDatabase();
    const { data: newPlaylist, error } = await supabase
      .from('playlists')
      .insert({
        name,
        description: description || '',
        created_by: req.user.id,
        subject_id: subject_id || null,
        grade_level: grade_level || null,
        is_public: !!is_public,
        is_featured: !!is_featured
      })
      .select()
      .single();

    if (error) throw error;
    
    res.status(201).json(newPlaylist);
  } catch (error) {
    console.error('Error creating playlist:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// Update a playlist (admin or owner)
router.put('/:id', authenticateToken, async (req, res) => {
  const playlistId = req.params.id;
  const { name, description, subject_id, grade_level, is_public, is_featured } = req.body;
  const isUserAdmin = req.user.role === 'admin';
  
  if (!name) {
    return res.status(400).json({ error: 'Playlist name is required' });
  }
  
  
try {
  const supabase = getDatabase();
  // Check if user is authorized
  const { data: playlist, error: fetchError } = await supabase
      .from('playlists')
      .select('created_by')
      .eq('id', playlistId)
      .single();

    if (fetchError) throw fetchError;
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    if (!isUserAdmin && playlist.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this playlist' });
    }
    
    const updates = {
      name,
      description: description || '',
      subject_id: subject_id || null,
      grade_level: grade_level || null,
      is_public: !!is_public,
      is_featured: !!is_featured,
      updated_at: new Date().toISOString()
    };

    const { data: updatedPlaylist, error } = await supabase
      .from('playlists')
      .update(updates)
      .eq('id', playlistId)
      .select()
      .single();

    if (error) throw error;
    
    res.json(updatedPlaylist);
  } catch (error) {
    console.error('Error updating playlist:', error);
    res.status(500).json({ error: 'Failed to update playlist' });
  }
});

// Delete a playlist (admin or owner)
router.delete('/:id', authenticateToken, async (req, res) => {
  const playlistId = req.params.id;
  const isUserAdmin = req.user.role === 'admin';
  
  
try {
  const supabase = getDatabase();
  // Check if user is authorized
  const { data: playlist, error: fetchError } = await supabase
      .from('playlists')
      .select('created_by')
      .eq('id', playlistId)
      .single();

    if (fetchError) throw fetchError;
    
    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    
    if (!isUserAdmin && playlist.created_by !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this playlist' });
    }
    
    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', playlistId);

    if (error) throw error;
    
    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

// Add a video to a playlist (admin only)
router.post('/:id/videos', authenticateToken, isAdmin, async (req, res) => {
  const playlistId = req.params.id;
  const { video_id, sort_order } = req.body;
  
  if (!video_id) {
    return res.status(400).json({ error: 'Video ID is required' });
  }
  
  
try {
  const supabase = getDatabase();
  // First check if the playlist exists
  const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('id')
      .eq('id', playlistId)
      .single();

    if (playlistError) throw playlistError;
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    
    // Then check if the video exists
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id')
      .eq('id', video_id)
      .single();

    if (videoError) throw videoError;
    if (!video) return res.status(404).json({ error: 'Video not found' });
    
    // Get the highest sort_order in the playlist
    const { data: maxOrderData, error: maxError } = await supabase
      .from('playlist_videos')
      .select('sort_order')
      .eq('playlist_id', playlistId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    if (maxError && maxError.code !== 'PGRST116') throw maxError;
    
    const nextSortOrder = sort_order !== undefined ? sort_order : (maxOrderData?.sort_order || 0) + 1;
    
    // Add the video to the playlist
    const { data: newEntry, error } = await supabase
      .from('playlist_videos')
      .insert({
        playlist_id: playlistId,
        video_id,
        sort_order: nextSortOrder
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Video already in playlist' });
      }
      throw error;
    }
    
    res.status(201).json(newEntry);
  } catch (error) {
    console.error('Error adding video to playlist:', error);
    res.status(500).json({ error: 'Failed to add video to playlist' });
  }
});

// Remove a video from a playlist (admin only)
router.delete('/:id/videos/:videoId', authenticateToken, isAdmin, async (req, res) => {
  const playlistId = req.params.id;
  const videoId = req.params.videoId;
  
  try {
    const supabase = getDatabase();
    const { error } = await supabase
      .from('playlist_videos')
      .delete()
      .eq('playlist_id', playlistId)
      .eq('video_id', videoId);

    if (error) throw error;
    
    res.json({ message: 'Video removed from playlist successfully' });
  } catch (error) {
    console.error('Error removing video from playlist:', error);
    res.status(500).json({ error: 'Failed to remove video from playlist' });
  }
});

// Update video order in playlist (admin only)
router.put('/:id/videos/:videoId/order', authenticateToken, isAdmin, async (req, res) => {
  const playlistId = req.params.id;
  const videoId = req.params.videoId;
  const { sort_order } = req.body;
  
  if (sort_order === undefined) {
    return res.status(400).json({ error: 'Sort order is required' });
  }
  
  
try {
  const supabase = getDatabase();
  const { data: updated, error } = await supabase
  .from('playlist_videos')
      .update({ sort_order })
      .eq('playlist_id', playlistId)
      .eq('video_id', videoId)
      .select()
      .single();

    if (error) throw error;
    if (!updated) return res.status(404).json({ error: 'Video not found in playlist' });
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating video order:', error);
    res.status(500).json({ error: 'Failed to update video order' });
  }
});

// Get videos in a playlist with progress (for admin or owner)
router.get('/:id/videos', authenticateToken, async (req, res) => {
  const supabase = getDatabase();
  const playlistId = req.params.id;
  const isUserAdmin = req.user.role === 'admin';
  
  try {
    // First check if playlist exists and user has access
    let query = supabase.from('playlists').select('*').eq('id', playlistId);
    if (!isUserAdmin) {
      query = query.or(`is_public.eq.true,created_by.eq.${req.user.id}`);
    }
    
    const { data: playlist, error: playlistError } = await query.single();
    
    if (playlistError) throw playlistError;
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    
    // Get videos
    const { data: rows, error: videosError } = await supabase
      .from('playlist_videos')
      .select('id, playlist_id, video_id, sort_order:order, videos(*)')
      .eq('playlist_id', playlistId)
      .order('sort_order', { ascending: true });

    if (videosError) throw videosError;
    
    // Replace thumbnail URLs
    const modifiedRows = rows.map(row => ({
      ...row,
      ...row.videos,
      thumbnail_url: row.videos?.thumbnail_url?.replace('maxresdefault.jpg', 'hqdefault.jpg')
    }));
    
    res.json(modifiedRows);
  } catch (error) {
    console.error('Error fetching playlist videos:', error);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// Get user progress for videos in a playlist
router.get('/:id/progress', authenticateToken, async (req, res) => {
  const playlistId = req.params.id;
  const userId = req.user.id;
  
  
try {
  const supabase = getDatabase();
  const { data: rows, error } = await supabase
  .from('playlist_videos')
      .select('video_id, video_progress!left(is_completed, last_watched_at)')
      .eq('playlist_id', playlistId)
      .eq('video_progress.user_id', userId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    
    const progress = rows.map(row => ({
      playlist_id: playlistId,
      video_id: row.video_id,
      completed: !!row.video_progress?.is_completed,
      last_watched: row.video_progress?.last_watched_at || null
    }));
    
    res.json(progress);
  } catch (error) {
    console.error('Error fetching playlist video progress:', error);
    res.status(500).json({ error: 'Failed to fetch playlist progress' });
  }
});

// Mark a video as completed in the playlist
router.post('/:id/progress', authenticateToken, async (req, res) => {
  const playlistId = req.params.id;
  const userId = req.user.id;
  const { video_id, completed } = req.body;

  if (!video_id) {
    return res.status(400).json({ error: 'video_id is required' });
  }

  
try {
  const supabase = getDatabase();

  // Get the video duration and check if in playlist
  const { data: video, error: videoError } = await supabase
  .from('playlist_videos')
      .select('videos(duration)')
      .eq('playlist_id', playlistId)
      .eq('video_id', video_id)
      .single();

    if (videoError) throw videoError;
    if (!video) return res.status(404).json({ error: 'Video not found in playlist' });

    const duration = video.videos.duration;
    const isCompleted = !!completed;
    const watchTime = isCompleted ? duration : 0;
    const progressPercent = isCompleted ? 100 : 0;
    const now = new Date().toISOString();

    // Upsert video progress
    const { error } = await supabase
      .from('video_progress')
      .upsert({
        user_id: userId,
        video_id,
        watch_time_seconds: watchTime,
        total_duration: duration,
        progress_percentage: progressPercent,
        is_completed: isCompleted,
        last_position: watchTime,
        last_watched_at: now,
        completed_at: isCompleted ? now : null
      }, { onConflict: ['user_id', 'video_id'] });

    if (error) throw error;

    res.json({ message: 'Progress updated successfully' });
  } catch (error) {
    console.error('Error updating video progress:', error);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

module.exports = router;