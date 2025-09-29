const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/connection');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Get all users with pagination and search
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  const { search, page = 1, limit = 10 } = req.query;
  const db = getDatabase();
  try {
    let countQuery = 'SELECT COUNT(*) as totalCount FROM user_profiles';
    let countParams = [];
    if (search) {
      countQuery += ' WHERE email LIKE ? OR full_name LIKE ?';
      countParams = [`%${search}%`, `%${search}%`];
    }
    const { totalCount } = await new Promise((resolve, reject) => {
      db.get(countQuery, countParams, (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    const totalPages = Math.ceil(totalCount / limit);

    let query = 'SELECT user_uuid as id, email, full_name as fullName, grade_level as gradeLevel, role, created_at FROM user_profiles';
    let params = [];
    if (search) {
      query += ' WHERE email LIKE ? OR full_name LIKE ?';
      params = [`%${search}%`, `%${search}%`];
    }
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const users = await new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) reject(err);
        resolve(rows);
      });
    });

    res.json({ users, totalPages, totalCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, isAdmin, async (req, res) => {
  const db = getDatabase();
  try {
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT user_uuid as id, email, full_name as fullName, grade_level as gradeLevel, role, created_at FROM user_profiles WHERE user_uuid = ?', [req.params.id], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create new user
router.post('/', authenticateToken, isAdmin, async (req, res) => {
  const { email, password, fullName, gradeLevel, role } = req.body;
  const db = getDatabase();
  try {
    const existing = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM user_profiles WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const hashed = bcrypt.hashSync(password, 10);
    const id = uuidv4();

    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO user_profiles (user_uuid, email, password_hash, full_name, grade_level, role) VALUES (?, ?, ?, ?, ?, ?)',
        [id, email, hashed, fullName, gradeLevel || '初中1', role || 'student'],
        (err) => {
          if (err) reject(err);
          resolve();
        }
      );
    });

    const newUser = { id, email, fullName, gradeLevel, role };
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user
router.put('/:id', authenticateToken, isAdmin, async (req, res) => {
  const { email, password, fullName, gradeLevel, role } = req.body;
  const db = getDatabase();
  try {
    const updates = [];
    const params = [];
    if (email) {
      updates.push('email = ?');
      params.push(email);
    }
    if (password) {
      const hashed = bcrypt.hashSync(password, 10);
      updates.push('password_hash = ?');
      params.push(hashed);
    }
    if (fullName) {
      updates.push('full_name = ?');
      params.push(fullName);
    }
    if (gradeLevel) {
      updates.push('grade_level = ?');
      params.push(gradeLevel);
    }
    if (role) {
      updates.push('role = ?');
      params.push(role);
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No updates provided' });

    const query = `UPDATE user_profiles SET ${updates.join(', ')} WHERE user_uuid = ?`;
    params.push(req.params.id);

    await new Promise((resolve, reject) => {
      db.run(query, params, (err) => {
        if (err) reject(err);
        resolve();
      });
    });

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user
router.delete('/:id', authenticateToken, isAdmin, async (req, res) => {
  const db = getDatabase();
  try {
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM user_profiles WHERE user_uuid = ?', [req.params.id], (err) => {
        if (err) reject(err);
        resolve();
      });
    });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;