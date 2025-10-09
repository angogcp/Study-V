const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
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

// Get all notes for a user with optional filters
router.get('/', async (req, res) => {
  const { video_id, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  if (req.user.role === 'guest') {
    return res.json({
      notes: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        pages: 0
      }
    });
  }
  
  const supabase = getDatabase();
  
  try {
    let query = supabase
      .from('user_notes')
      .select('*, videos!user_notes_video_id_fkey(title:video_title, title_chinese:video_title_chinese, subjects(name_chinese:subject_name))')
      .eq('user_id', req.user.id);
    
    if (video_id) {
      query = query.eq('video_id', video_id);
    }
    
    if (search) {
      const searchTerm = `%${search}%`;
      query = query.or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`);
    }
    
    const { data: notes, error } = await query
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    // Get total count
    let countQuery = supabase
      .from('user_notes')
      .select('count(*)', { count: 'exact', head: true })
      .eq('user_id', req.user.id);
    
    if (video_id) countQuery = countQuery.eq('video_id', video_id);
    if (search) {
      const searchTerm = `%${search}%`;
      countQuery = countQuery.or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`);
    }
    
    const { count } = await countQuery;
    
    res.json({
      notes,
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

// Get notes for a specific video
router.get('/video/:videoId', async (req, res) => {
  const supabase = getDatabase();
  
  try {
    const { data: notes, error } = await supabase
      .from('user_notes')
      .select('*, videos!user_notes_video_id_fkey(title:video_title, title_chinese:video_title_chinese)')
      .eq('user_id', req.user.id)
      .eq('video_id', req.params.videoId)
      .order('timestamp_seconds', { ascending: true })
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    res.json(notes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get single note by ID
router.get('/:id', async (req, res) => {
  const supabase = getDatabase();
  
  try {
    const { data: note, error } = await supabase
      .from('user_notes')
      .select('*, videos!user_notes_video_id_fkey(title:video_title, title_chinese:video_title_chinese, thumbnail_url, subjects(name_chinese:subject_name))')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();
    
    if (error) throw error;
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    res.json(note);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create new note
router.post('/', async (req, res) => {
  const {
    videoId,
    title = 'Untitled Note',
    content,
    contentHtml,
    timestampSeconds = 0,
    isPrivate = true,
    tags = []
  } = req.body;

  if (!videoId || !content) {
    return res.status(400).json({ error: 'Video ID and content are required' });
  }

  const supabase = getDatabase();
  
  try {
    const { data, error } = await supabase
      .from('user_notes')
      .insert({
        user_id: req.user.id,
        video_id: videoId,
        title,
        content,
        content_html: contentHtml || '',
        timestamp_seconds: timestampSeconds,
        is_private: isPrivate,
        tags: Array.isArray(tags) ? tags.join(',') : tags
      })
      .select('id')
      .single();
    
    if (error) throw error;
    
    await updateUserNotesCount(req.user.id, supabase);
    
    res.json({
      id: data.id,
      message: 'Note created successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update note
router.put('/:id', async (req, res) => {
  const {
    title,
    content,
    contentHtml,
    timestampSeconds,
    isPrivate,
    tags
  } = req.body;

  const noteId = req.params.id;
  const supabase = getDatabase();
  
  try {
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (contentHtml !== undefined) updates.content_html = contentHtml;
    if (timestampSeconds !== undefined) updates.timestamp_seconds = timestampSeconds;
    if (isPrivate !== undefined) updates.is_private = isPrivate;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags.join(',') : tags;
    updates.updated_at = new Date().toISOString();
    
    const { error } = await supabase
      .from('user_notes')
      .update(updates)
      .eq('id', noteId)
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    
    res.json({ message: 'Note updated successfully' });
  } catch (error) {
    console.error(error);
    if (error.code === 'PGRST204') {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete note
router.delete('/:id', async (req, res) => {
  const supabase = getDatabase();
  
  try {
    const { error } = await supabase
      .from('user_notes')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    
    await updateUserNotesCount(req.user.id, supabase);
    
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error(error);
    if (error.code === 'PGRST204') {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

// Export notes to PDF
router.post('/export/pdf', async (req, res) => {
  if (req.user.role === 'guest') {
    return res.status(403).json({ message: 'Guest users cannot export notes' });
  }
  
  const { noteIds, videoId, format = 'detailed' } = req.body;

  const supabase = getDatabase();
  
  try {
    let query = supabase
      .from('user_notes')
      .select('*, videos!user_notes_video_id_fkey(title:video_title, title_chinese:video_title_chinese, subjects(name_chinese:subject_name)), user_profiles(full_name:user_name)')
      .eq('user_id', req.user.id);
    
    if (noteIds && noteIds.length > 0) {
      query = query.in('id', noteIds);
    } else if (videoId) {
      query = query.eq('video_id', videoId);
    }
    
    const { data: notes, error } = await query
      .order('videos.title', { ascending: true })
      .order('timestamp_seconds', { ascending: true })
      .order('created_at', { ascending: true });
    
    if (error) throw error;

    if (notes.length === 0) {
      return res.status(404).json({ error: 'No notes found' });
    }

    const htmlContent = generateNotesHTML(notes, format);
    const pdf = await generatePDF(htmlContent);
    
    const fileName = `notes_${Date.now()}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(pdf);
    
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Helper function to generate HTML for PDF
function generateNotesHTML(notes, format) {
  const groupedNotes = notes.reduce((acc, note) => {
    const key = `${note.video_title} (${note.subject_name})`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(note);
    return acc;
  }, {});

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>学习笔记</title>
      <style>
        body { font-family: 'Microsoft YaHei', Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .video-section { margin-bottom: 40px; }
        .video-title { font-size: 20px; font-weight: bold; color: #2563eb; margin-bottom: 15px; }
        .note { margin-bottom: 25px; padding: 15px; border-left: 4px solid #3b82f6; background: #f8fafc; }
        .note-title { font-weight: bold; color: #1e40af; margin-bottom: 8px; }
        .note-meta { font-size: 12px; color: #6b7280; margin-bottom: 10px; }
        .note-content { color: #374151; }
        .timestamp { background: #dbeafe; padding: 2px 6px; border-radius: 3px; font-size: 11px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>学习笔记导出</h1>
        <p>导出时间: ${new Date().toLocaleString('zh-CN')}</p>
        <p>学生: ${notes[0]?.user_name || ''}</p>
      </div>
  `;

  Object.keys(groupedNotes).forEach(videoTitle => {
    const videoNotes = groupedNotes[videoTitle];
    html += `<div class="video-section">`;
    html += `<h2 class="video-title">${videoTitle}</h2>`;
    
    videoNotes.forEach(note => {
      html += `<div class="note">`;
      html += `<div class="note-title">${note.title}</div>`;
      
      if (format === 'detailed') {
        html += `<div class="note-meta">`;
        if (note.timestamp_seconds > 0) {
          const minutes = Math.floor(note.timestamp_seconds / 60);
          const seconds = note.timestamp_seconds % 60;
          html += `<span class="timestamp">时间点: ${minutes}:${seconds.toString().padStart(2, '0')}</span> `;
        }
        html += `创建时间: ${new Date(note.created_at).toLocaleString('zh-CN')}`;
        html += `</div>`;
      }
      
      html += `<div class="note-content">${note.content_html || note.content.replace(/\n/g, '<br>')}</div>`;
      html += `</div>`;
    });
    
    html += `</div>`;
  });

  html += `
    </body>
    </html>
  `;

  return html;
}

// Helper function to generate PDF using Puppeteer
async function generatePDF(htmlContent) {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  
  const pdf = await page.pdf({
    format: 'A4',
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    },
    printBackground: true
  });
  
  await browser.close();
  return pdf;
}

// Helper function to update user notes count
async function updateUserNotesCount(userId, supabase) {
  try {
    const { count, error: countError } = await supabase
      .from('user_notes')
      .select('count(*)', { count: 'exact', head: true })
      .eq('user_id', userId);
    
    if (countError) throw countError;
    
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({
        notes_count: count,
        updated_at: new Date().toISOString()
      })
      .eq('user_uuid', userId);
    
    if (updateError) throw updateError;
  } catch (error) {
    console.error('Failed to update user notes count:', error);
  }
}

module.exports = router;