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
router.get('/', (req, res) => {
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
  
  let query = `
    SELECT n.*, v.title as video_title, v.title_chinese as video_title_chinese,
           v.thumbnail_url, s.name_chinese as subject_name
    FROM user_notes n
    JOIN videos v ON n.video_id = v.id
    JOIN subjects s ON v.subject_id = s.id
    WHERE n.user_id = ?
  `;
  let params = [req.user.id];

  if (video_id) {
    query += ` AND n.video_id = ?`;
    params.push(video_id);
  }

  if (search) {
    query += ` AND (n.title LIKE ? OR n.content LIKE ?)`;
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam);
  }

  query += ` ORDER BY n.updated_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const db = getDatabase();

  db.all(query, params, (err, notes) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM user_notes WHERE user_id = ?`;
    let countParams = [req.user.id];
    
    if (video_id) {
      countQuery += ` AND video_id = ?`;
      countParams.push(video_id);
    }
    
    if (search) {
      countQuery += ` AND (title LIKE ? OR content LIKE ?)`;
      const searchParam = `%${search}%`;
      countParams.push(searchParam, searchParam);
    }

    db.get(countQuery, countParams, (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        notes,
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

// Get notes for a specific video
router.get('/video/:videoId', (req, res) => {
  const db = getDatabase();
  
  db.all(
    `SELECT n.*, v.title as video_title, v.title_chinese as video_title_chinese
     FROM user_notes n
     JOIN videos v ON n.video_id = v.id
     WHERE n.user_id = ? AND n.video_id = ?
     ORDER BY n.timestamp_seconds ASC, n.created_at ASC`,
    [req.user.id, req.params.videoId],
    (err, notes) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json(notes);
    }
  );
});

// Get single note by ID
router.get('/:id', (req, res) => {
  const db = getDatabase();
  
  db.get(
    `SELECT n.*, v.title as video_title, v.title_chinese as video_title_chinese,
            v.thumbnail_url, s.name_chinese as subject_name
     FROM user_notes n
     JOIN videos v ON n.video_id = v.id
     JOIN subjects s ON v.subject_id = s.id
     WHERE n.id = ? AND n.user_id = ?`,
    [req.params.id, req.user.id],
    (err, note) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!note) {
        return res.status(404).json({ error: 'Note not found' });
      }
      
      res.json(note);
    }
  );
});

// Create new note
router.post('/', (req, res) => {
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

  const db = getDatabase();

  db.run(
    `INSERT INTO user_notes (
      user_id, video_id, title, content, content_html, 
      timestamp_seconds, is_private, tags
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      videoId,
      title,
      content,
      contentHtml || '',
      timestampSeconds,
      isPrivate ? 1 : 0,
      Array.isArray(tags) ? tags.join(',') : tags
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create note' });
      }

      // Update user notes count
      updateUserNotesCount(req.user.id);

      res.json({
        id: this.lastID,
        message: 'Note created successfully'
      });
    }
  );
});

// Update note
router.put('/:id', (req, res) => {
  const {
    title,
    content,
    contentHtml,
    timestampSeconds,
    isPrivate,
    tags
  } = req.body;

  const noteId = req.params.id;
  const db = getDatabase();

  db.run(
    `UPDATE user_notes SET 
     title = COALESCE(?, title),
     content = COALESCE(?, content),
     content_html = COALESCE(?, content_html),
     timestamp_seconds = COALESCE(?, timestamp_seconds),
     is_private = COALESCE(?, is_private),
     tags = COALESCE(?, tags),
     updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    [
      title,
      content,
      contentHtml,
      timestampSeconds,
      isPrivate !== undefined ? (isPrivate ? 1 : 0) : undefined,
      Array.isArray(tags) ? tags.join(',') : tags,
      noteId,
      req.user.id
    ],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update note' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }

      res.json({ message: 'Note updated successfully' });
    }
  );
});

// Delete note
router.delete('/:id', (req, res) => {
  const db = getDatabase();

  db.run(
    `DELETE FROM user_notes WHERE id = ? AND user_id = ?`,
    [req.params.id, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete note' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }

      // Update user notes count
      updateUserNotesCount(req.user.id);

      res.json({ message: 'Note deleted successfully' });
    }
  );
});

// Export notes to PDF
router.post('/export/pdf', async (req, res) => {
  if (req.user.role === 'guest') {
    return res.status(403).json({ message: 'Guest users cannot export notes' });
  }
  
  const { noteIds, videoId, format = 'detailed' } = req.body;

  try {
    const db = getDatabase();
    
    let query = `
      SELECT n.*, v.title as video_title, v.title_chinese as video_title_chinese,
             s.name_chinese as subject_name, u.full_name as user_name
      FROM user_notes n
      JOIN videos v ON n.video_id = v.id
      JOIN subjects s ON v.subject_id = s.id
      JOIN user_profiles u ON n.user_id = u.user_uuid
      WHERE n.user_id = ?
    `;
    let params = [req.user.id];

    if (noteIds && noteIds.length > 0) {
      const placeholders = noteIds.map(() => '?').join(',');
      query += ` AND n.id IN (${placeholders})`;
      params.push(...noteIds);
    } else if (videoId) {
      query += ` AND n.video_id = ?`;
      params.push(videoId);
    }

    query += ` ORDER BY v.title, n.timestamp_seconds ASC, n.created_at ASC`;

    db.all(query, params, async (err, notes) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (notes.length === 0) {
        return res.status(404).json({ error: 'No notes found' });
      }

      try {
        const htmlContent = generateNotesHTML(notes, format);
        const pdf = await generatePDF(htmlContent);
        
        const fileName = `notes_${Date.now()}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.send(pdf);
        
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        res.status(500).json({ error: 'Failed to generate PDF' });
      }
    });
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
function updateUserNotesCount(userId) {
  const db = getDatabase();
  
  db.run(
    `UPDATE user_profiles SET 
     notes_count = (SELECT COUNT(*) FROM user_notes WHERE user_id = ?),
     updated_at = CURRENT_TIMESTAMP
     WHERE user_uuid = ?`,
    [userId, userId],
    (err) => {
      if (err) {
        console.error('Failed to update user notes count:', err);
      }
    }
  );
}

module.exports = router;