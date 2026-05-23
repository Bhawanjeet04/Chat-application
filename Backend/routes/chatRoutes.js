const express = require('express');
const router = express.Router();
const { getChatHistory, saveMessage, togglePreserveHistory } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.get('/:connectionId', protect, getChatHistory);
router.post('/message', protect, saveMessage);
router.put('/toggle-preserve/:connectionId', protect, togglePreserveHistory);

module.exports = router;