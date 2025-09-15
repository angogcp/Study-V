const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDatabase } = require('../database/connection');
const { authenticateToken, requireAdmin, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
  const db = getDatabase();
  const { search, page = 1, limit = 10 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = `SELECT user_uuid as id, email, full_name, role, grade_level, created_at FROM user_profiles`;
  let countQuery = `SELECT COUNT(*) as count FROM user_profiles`;
  const params = [];
  const countParams = [];

  if (search) {
    query += ` WHERE email LIKE ? OR full_name LIKE ?`;
    countQuery += ` WHERE email LIKE ? OR full_name LIKE ?`;
    params.push(`%${search}%`, `%${search}%`);
    countParams.push(`%${search}%`, `%${search}%`);
  }

  query += ` LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);

  db.get(countQuery, countParams, (err, countRow) => {
    if (err) {
      db.close();
      return res.status(500).json({ error: 'Database error' });
    }
    const totalUsers = countRow.count;
    const totalPages = Math.ceil(totalUsers / parseInt(limit));

    db.all(query, params, (err, users) => {
      if (err) {
        db.close();
        return res.status(500).json({ error: 'Database error' });
      }
      
      // 转换数据格式以匹配前端期望
      const formattedUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        gradeLevel: user.grade_level,
        createdAt: user.created_at
      }));
      
      res.json({ users: formattedUsers, totalPages, totalCount: totalUsers });
      db.close();
    });
  });
});

// Get single user (admin only)
router.get('/:id', authenticateToken, requireAdmin, (req, res) => {
  const db = getDatabase();
  db.get(
    `SELECT * FROM user_profiles WHERE user_uuid = ?`,
    [req.params.id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ user });
    }
  );
  db.close();
});

// Create new user (admin only)
router.post('/', authenticateToken, requireAdmin, (req, res) => {
  const { email, password, fullName, gradeLevel, role } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Required fields missing' });
  }

  const db = getDatabase();
  const userUuid = uuidv4();
  const hashedPassword = bcrypt.hashSync(password, 10);

  db.run(
    `INSERT INTO user_profiles (user_uuid, email, password_hash, full_name, grade_level, role) VALUES (?, ?, ?, ?, ?, ?)`,
    [userUuid, email, hashedPassword, fullName, gradeLevel || '初中1', role || 'student'],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ error: 'Email already registered' });
        }
        return res.status(500).json({ error: 'Failed to create user' });
      }
      res.json({ message: 'User created successfully', userId: userUuid });
    }
  );
  db.close();
});

// Update user (admin only)
router.put('/:id', authenticateToken, requireAdmin, (req, res) => {
  const { email, fullName, gradeLevel, role, password } = req.body;
  const db = getDatabase();

  let updateFields = [];
  let params = [];

  if (email) {
    updateFields.push('email = ?');
    params.push(email);
  }
  if (fullName) {
    updateFields.push('full_name = ?');
    params.push(fullName);
  }
  if (gradeLevel) {
    updateFields.push('grade_level = ?');
    params.push(gradeLevel);
  }
  if (role) {
    updateFields.push('role = ?');
    params.push(role);
  }
  if (password) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    updateFields.push('password_hash = ?');
    params.push(hashedPassword);
  }

  if (updateFields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  params.push(req.params.id);

  db.run(
    `UPDATE user_profiles SET ${updateFields.join(', ')} WHERE user_uuid = ?`,
    params,
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update user' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ message: 'User updated successfully' });
    }
  );
  db.close();
});

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
  const db = getDatabase();
  db.run(
    `DELETE FROM user_profiles WHERE user_uuid = ?`,
    [req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete user' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ message: 'User deleted successfully' });
    }
  );
  db.close();
});

module.exports = router;