const express = require('express');
const router = express.Router();

// Simple test endpoint to verify CORS is working
router.get('/ping', (req, res) => {
  res.status(200).json({ message: 'pong', success: true });
});

module.exports = router;