const express = require('express');
const { getDatabase } = require('../database/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all chapters with optional filters
router.get('/', (req, res) => {
  const { subject_id, grade_level } = req.query;
  
  let query = `
    SELECT c.*, s.name as subject_name, s.name_chinese as subject_name_chinese
    FROM chapters c
    JOIN subjects s ON c.subject_id = s.id
  `;
  let params = [];

  if (subject_id) {
    query += ` WHERE c.subject_id = ?`;
    params.push(subject_id);
  }

  if (grade_level) {
    query += subject_id ? ` AND c.grade_level = ?` : ` WHERE c.grade_level = ?`;
    params.push(grade_level);
  }

  query += ` ORDER BY c.sort_order ASC`;

  const db = getDatabase();

  db.all(query, params, (err, chapters) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ chapters });
  });
});

// Create new chapter (admin only)
router.post('/', (req, res) => {
  const { subject_id, grade_level, name, sort_order } = req.body;
  console.log('Received chapter data:', { subject_id, grade_level, name, sort_order });

  if (!subject_id || !grade_level || !name) {
    return res.status(400).json({ error: 'Subject ID, grade level, and name are required' });
  }

  const db = getDatabase();

  db.run(
    `INSERT INTO chapters (subject_id, grade_level, name, sort_order) VALUES (?, ?, ?, ?)` ,
    [subject_id, grade_level, name, sort_order || 0],
    function(err) {
      if (err) {
        console.error('Database error creating chapter:', err);
        return res.status(500).json({ error: 'Failed to create chapter' });
      }

      res.json({
        id: this.lastID,
        message: 'Chapter created successfully'
      });
    }
  );
});

// Update chapter (admin only)
router.put('/:id', (req, res) => {
  const { subject_id, grade_level, name, sort_order } = req.body;
  const chapterId = req.params.id;

  const db = getDatabase();

  db.run(
    `UPDATE chapters SET 
     subject_id = COALESCE(?, subject_id),
     grade_level = COALESCE(?, grade_level),
     name = COALESCE(?, name),
     sort_order = COALESCE(?, sort_order)
     WHERE id = ?` ,
    [subject_id, grade_level, name, sort_order, chapterId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update chapter' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Chapter not found' });
      }

      res.json({ message: 'Chapter updated successfully' });
    }
  );
});

// Delete chapter (admin only)
router.delete('/:id', (req, res) => {
  const db = getDatabase();

  db.run(
    `DELETE FROM chapters WHERE id = ?` ,
    [req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete chapter' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Chapter not found' });
      }

      res.json({ message: 'Chapter deleted successfully' });
    }
  );
});

module.exports = router;