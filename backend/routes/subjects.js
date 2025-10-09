const express = require('express');
const { getDatabase } = require('../database/connection');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get all subjects
router.get('/', async (req, res) => {
  const supabase = getDatabase();

  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('is_active', 1)
    .order('sort_order')
    .order('name_chinese');

  if (error) {
    console.error('Supabase error in get all subjects:', JSON.stringify(error, null, 2));
    return res.status(500).json({ error: 'Database error' });
  }
  res.json(data);
});

// Get subject by ID
router.get('/:id', async (req, res) => {
  const supabase = getDatabase();
  
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', req.params.id)
    .eq('is_active', 1)
    .single();

  if (error) {
    return res.status(500).json({ error: 'Database error' });
  }
  
  if (!data) {
    return res.status(404).json({ error: 'Subject not found' });
  }
  
  res.json(data);
});

// Create new subject (admin only)
router.post('/', async (req, res) => {
  const { name, name_chinese, description, icon_url, color_code, sort_order } = req.body;

  if (!name || !name_chinese) {
    return res.status(400).json({ error: 'Name and Chinese name are required' });
  }

  const supabase = getDatabase();

  const { data, error } = await supabase
    .from('subjects')
    .insert({
      name,
      name_chinese,
      description,
      icon_url,
      color_code: color_code || '#3B82F6',
      sort_order: sort_order || 0
    })
    .select();

  if (error) {
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(400).json({ error: 'Subject name already exists' });
    }
    return res.status(500).json({ error: 'Failed to create subject' });
  }

  res.json({
    ...data[0],
    message: 'Subject created successfully'
  });
});

// Update subject (admin only)
router.put('/:id', async (req, res) => {
  const { name, name_chinese, description, icon_url, color_code, sort_order, is_active } = req.body;
  const subjectId = req.params.id;

  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (name_chinese !== undefined) updateData.name_chinese = name_chinese;
  if (description !== undefined) updateData.description = description;
  if (icon_url !== undefined) updateData.icon_url = icon_url;
  if (color_code !== undefined) updateData.color_code = color_code;
  if (sort_order !== undefined) updateData.sort_order = sort_order;
  if (is_active !== undefined) updateData.is_active = is_active;

  const supabase = getDatabase();

  const { error, count } = await supabase
    .from('subjects')
    .update(updateData)
    .eq('id', subjectId);

  if (error) {
    return res.status(500).json({ error: 'Failed to update subject' });
  }

  if (count === 0) {
    return res.status(404).json({ error: 'Subject not found' });
  }

  res.json({ message: 'Subject updated successfully' });
});

// Delete subject (admin only)
router.delete('/:id', async (req, res) => {
  const supabase = getDatabase();

  const { error, count } = await supabase
    .from('subjects')
    .update({ is_active: 0 })
    .eq('id', req.params.id);

  if (error) {
    return res.status(500).json({ error: 'Failed to delete subject' });
  }

  if (count === 0) {
    return res.status(404).json({ error: 'Subject not found' });
  }

  res.json({ message: 'Subject deleted successfully' });
});

module.exports = router;