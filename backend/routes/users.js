const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/connection');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Get all users with pagination and search
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  const supabase = getDatabase();
  const { search, page = 1, limit = 10 } = req.query;
  try {
    let query = supabase.from('user_profiles').select('user_uuid:id, email, full_name, grade_level, role, created_at', { count: 'exact' });

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    query = query.range((page - 1) * limit, page * limit - 1).order('created_at', { ascending: false });

    const { data: users, count: totalCount, error } = await query;

    if (error) throw error;

    // Transform the data to match the expected format in the frontend
    const transformedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      gradeLevel: user.grade_level,
      role: user.role,
      created_at: user.created_at
    }));

    const totalPages = Math.ceil(totalCount / limit);

    res.json({ users: transformedUsers, totalPages, totalCount });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, isAdmin, async (req, res) => {
  const supabase = getDatabase();
  try {
    const { data: user, error } = await supabase
      .from('user_profiles')
      .select('user_uuid:id, email, full_name, grade_level, role, created_at')
      .eq('user_uuid', req.params.id)
      .single();

    if (error) throw error;
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Transform to match expected format
    const transformedUser = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      gradeLevel: user.grade_level,
      role: user.role,
      created_at: user.created_at
    };

    res.json(transformedUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  const supabase = getDatabase();
  const { email, password, fullName, gradeLevel, role } = req.body;
  console.log('Received create user body:', req.body);
  try {
    const { data: existing, error: checkError } = await supabase
      .from('user_profiles')
      .select('user_uuid')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const hashed = bcrypt.hashSync(password, 10);
    const id = uuidv4();

    const { data: newUser, error } = await supabase
      .from('user_profiles')
      .insert({
        user_uuid: id,
        email,
        password_hash: hashed,
        full_name: fullName,
        grade_level: gradeLevel || '初中1',
        role: role || 'student'
      })
      .select('user_uuid:id, email, full_name, grade_level, role')
      .single();

    if (error) throw error;

    // Transform to match expected format
    const transformedUser = {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.full_name,
      gradeLevel: newUser.grade_level,
      role: newUser.role
    };

    res.status(201).json(transformedUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  const supabase = getDatabase();
  const { email, password, fullName, gradeLevel, role } = req.body;
  try {
    const updates = {};
    if (email) updates.email = email;
    if (password) updates.password_hash = bcrypt.hashSync(password, 10);
    if (fullName) updates.full_name = fullName;
    if (gradeLevel) updates.grade_level = gradeLevel;
    if (role) updates.role = role;

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'No updates provided' });

    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('user_uuid', req.params.id);

    if (error) throw error;

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  const supabase = getDatabase();
  try {
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_uuid', req.params.id);

    if (error) throw error;

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;