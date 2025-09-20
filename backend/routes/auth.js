const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/connection');
const protect = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  const { email, password, full_name, grade_level } = req.body;
  const db = getDatabase();
  try {
    // Check if user exists
    const existing = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM user_profiles WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const hashed = bcrypt.hashSync(password, 10);
    const uuid = require('uuid').v4();

    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO user_profiles (user_uuid, email, password_hash, full_name, grade_level, role) VALUES (?, ?, ?, ?, ?, ?)',
        [uuid, email, hashed, full_name, grade_level || '初中1', 'student'],
        (err) => {
          if (err) reject(err);
          resolve();
        }
      );
    });

    const user = { id: uuid, email, full_name, grade_level, role: 'student' };
    const token = jwt.sign(user, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ user, token });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const db = getDatabase();
  try {
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM user_profiles WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const userData = { id: user.user_uuid, email: user.email, full_name: user.full_name, grade_level: user.grade_level, role: user.role };
    const token = jwt.sign(userData, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ user: userData, token });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Profile
router.get('/profile', protect, (req, res) => {
  res.json(req.user);
});

module.exports = router;