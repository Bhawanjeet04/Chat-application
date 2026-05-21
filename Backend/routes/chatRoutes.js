const express = require('express');
const router = express.Router();
const { getChatHistory, saveMessage } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:connectionId', protect, getChatHistory);
router.post('/message', protect, saveMessage);

module.exports = router;