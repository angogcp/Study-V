const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/connection');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', (req, res) => {
  const { email, password, fullName, gradeLevel } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const db = getDatabase();
  const userUuid = uuidv4();
  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO user_profiles (user_uuid, email, password_hash, full_name, grade_level) VALUES (?, ?, ?, ?, ?)`,
    [userUuid, email, hashedPassword, fullName, gradeLevel || '初中1'],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Email already registered' });
        }
        return res.status(500).json({ error: 'Failed to register user' });
      }

      const token = jwt.sign(
        { id: userUuid, email, role: 'student' },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'User registered successfully',
        user: { id: userUuid, email, fullName, role: 'student', gradeLevel },
        token
      });
    }
  );

  db.close();
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDatabase();

  db.get(
    `SELECT * FROM user_profiles WHERE email = ?`,
    [email],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isValidPassword = bcrypt.compareSync(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { id: user.user_uuid, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        user: {
          id: user.user_uuid,
          email: user.email,
          fullName: user.full_name,
          role: user.role,
          gradeLevel: user.grade_level,
          totalWatchTime: user.total_watch_time,
          videosCompleted: user.videos_completed,
          notesCount: user.notes_count
        },
        token
      });
    }
  );

  db.close();
});

// Get current user profile
router.get('/profile', require('../middleware/auth').authenticateToken, (req, res) => {
  const db = getDatabase();

  db.get(
    `SELECT * FROM user_profiles WHERE user_uuid = ?`,
    [req.user.id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        id: user.user_uuid,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        gradeLevel: user.grade_level,
        avatarUrl: user.avatar_url,
        totalWatchTime: user.total_watch_time,
        videosCompleted: user.videos_completed,
        notesCount: user.notes_count,
        createdAt: user.created_at
      });
    }
  );

  db.close();
});

module.exports = router;