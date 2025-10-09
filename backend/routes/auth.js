const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  const { email, password, full_name, grade_level } = req.body;
  const supabase = getDatabase();
  try {
    // Check if user exists
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const hashed = bcrypt.hashSync(password, 10);
    const uuid = require('uuid').v4();

    const { error } = await supabase
      .from('user_profiles')
      .insert({
        user_uuid: uuid,
        email,
        password_hash: hashed,
        full_name,
        grade_level: grade_level || '初中1',
        role: 'student'
      });

    if (error) throw error;

    const user = { id: uuid, email, full_name, grade_level, role: 'student' };
    const token = jwt.sign(user, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ user, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt for email:', email);
  const supabase = getDatabase();
  try {
    console.log('Querying database for user');
    const { data: user } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) {
      console.log('No user found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    console.log('Comparing passwords');
    const passwordMatch = bcrypt.compareSync(password, user.password_hash);
    console.log('Password match:', passwordMatch);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const userData = { id: user.user_uuid, email: user.email, full_name: user.full_name, grade_level: user.grade_level, role: user.role };
    const token = jwt.sign(userData, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ user: userData, token });
  } catch (error) {
    console.log('Login catch error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Profile
router.get('/profile', authenticateToken, (req, res) => {
  res.json(req.user);
});

module.exports = router;