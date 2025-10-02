const express = require('express');
const { getDatabase } = require('../database/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all chapters with optional filters
router.get('/', async (req, res) => {
  const { subject_id, grade_level } = req.query;
  
  const db = getDatabase();
  
  let sql = `
  SELECT c.*, 
         s.name as subject_name, 
         s.name_chinese as subject_name_chinese
  FROM chapters c
  INNER JOIN subjects s ON c.subject_id = s.id
`;
const params = [];
const whereClauses = [];

if (subject_id) {
  whereClauses.push('c.subject_id = ?');
  params.push(subject_id);
}

if (grade_level) {
  whereClauses.push('c.grade_level = ?');
  params.push(grade_level);
}

if (whereClauses.length > 0) {
  sql += ' WHERE ' + whereClauses.join(' AND ');
}

sql += ' ORDER BY c.sort_order ASC';

db.all(sql, params, (err, rows) => {
  if (err) {
    return res.status(500).json({ error: 'Database error' });
  }
  res.json(rows);
});
});

// Create new chapter (admin only)
router.post('/', async (req, res) => {
  const { subject_id, grade_level, name, sort_order } = req.body;
  console.log('Received chapter data:', { subject_id, grade_level, name, sort_order });

  if (!subject_id || !grade_level || !name) {
    return res.status(400).json({ error: 'Subject ID, grade level, and name are required' });
  }

  const db = getDatabase();

  const { data, error } = await db.from('chapters')
    .insert({ subject_id, grade_level, name, sort_order: sort_order || 0 })
    .select();

  if (error) {
    console.error('Database error creating chapter:', error);
    return res.status(500).json({ error: 'Failed to create chapter' });
  }

  res.json({
    id: data[0].id,
    message: 'Chapter created successfully'
  });
});

// Update chapter (admin only)
router.put('/:id', async (req, res) => {
  const { subject_id, grade_level, name, sort_order } = req.body;
  const chapterId = req.params.id;

  const updateData = {};
  if (subject_id !== undefined) updateData.subject_id = subject_id;
  if (grade_level !== undefined) updateData.grade_level = grade_level;
  if (name !== undefined) updateData.name = name;
  if (sort_order !== undefined) updateData.sort_order = sort_order;

  const db = getDatabase();

  const { data, count, error } = await db.from('chapters')
    .update(updateData, { count: 'exact' })
    .eq('id', chapterId)
    .select();

  if (error) {
    return res.status(500).json({ error: 'Failed to update chapter' });
  }

  if (count === 0) {
    return res.status(404).json({ error: 'Chapter not found' });
  }

  res.json({ message: 'Chapter updated successfully' });
});

// Delete chapter (admin only)
router.delete('/:id', async (req, res) => {
  const db = getDatabase();

  const { count, error } = await db.from('chapters')
    .delete({ count: 'exact' })
    .eq('id', req.params.id);

  if (error) {
    return res.status(500).json({ error: 'Failed to delete chapter' });
  }

  if (count === 0) {
    return res.status(404).json({ error: 'Chapter not found' });
  }

  res.json({ message: 'Chapter deleted successfully' });
});

module.exports = router;