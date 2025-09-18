const express = require('express');
const router = express.Router();

// Simple test endpoint to verify CORS is working
router.get('/ping', (req, res) => {
  res.status(200).json({ message: 'pong', success: true });
});

// Test endpoint that mimics the login endpoint
router.post('/auth-test', (req, res) => {
  res.status(200).json({ 
    message: 'Auth test successful', 
    success: true,
    received: req.body
  });
});

module.exports = router;