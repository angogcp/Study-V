const express = require('express');
const { getDatabase } = require('../database/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all subjects
router.get('/', (req, res) => {
  const db = getDatabase();

  db.all(
    `SELECT * FROM subjects WHERE is_active = 1 ORDER BY sort_order, name_chinese`,
    [],
    (err, subjects) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(subjects);
    }
  );
});

// Get subject by ID
router.get('/:id', (req, res) => {
  const db = getDatabase();
  
  db.get(
    `SELECT * FROM subjects WHERE id = ? AND is_active = 1`,
    [req.params.id],
    (err, subject) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!subject) {
        return res.status(404).json({ error: 'Subject not found' });
      }
      
      res.json(subject);
    }
  );
});

// Create new subject (admin only)
router.post('/', (req, res) => {
  const { name, nameChinese, description, iconUrl, colorCode, sortOrder } = req.body;

  if (!name || !nameChinese) {
    return res.status(400).json({ error: 'Name and Chinese name are required' });
  }

  const db = getDatabase();

  db.run(
    `INSERT INTO subjects (name, name_chinese, description, icon_url, color_code, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
    [name, nameChinese, description, iconUrl, colorCode || '#3B82F6', sortOrder || 0],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Subject name already exists' });
        }
        return res.status(500).json({ error: 'Failed to create subject' });
      }

      res.json({
        id: this.lastID,
        name,
        nameChinese,
        description,
        iconUrl,
        colorCode: colorCode || '#3B82F6',
        sortOrder: sortOrder || 0,
        message: 'Subject created successfully'
      });
    }
  );
});

// Update subject (admin only)
router.put('/:id', (req, res) => {
  const { name, nameChinese, description, iconUrl, colorCode, sortOrder, isActive } = req.body;
  const subjectId = req.params.id;

  const db = getDatabase();

  db.run(
    `UPDATE subjects SET 
     name = COALESCE(?, name),
     name_chinese = COALESCE(?, name_chinese),
     description = COALESCE(?, description),
     icon_url = COALESCE(?, icon_url),
     color_code = COALESCE(?, color_code),
     sort_order = COALESCE(?, sort_order),
     is_active = COALESCE(?, is_active)
     WHERE id = ?`,
    [name, nameChinese, description, iconUrl, colorCode, sortOrder, isActive, subjectId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update subject' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Subject not found' });
      }

      res.json({ message: 'Subject updated successfully' });
    }
  );
});

// Delete subject (admin only)
router.delete('/:id', (req, res) => {
  const db = getDatabase();

  db.run(
    `UPDATE subjects SET is_active = 0 WHERE id = ?`,
    [req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete subject' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Subject not found' });
      }

      res.json({ message: 'Subject deleted successfully' });
    }
  );
});

module.exports = router;