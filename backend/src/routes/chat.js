const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { verifyToken } = require('../middleware/auth');

router.get('/conversations', verifyToken, chatController.getConversations);
router.post('/conversations', verifyToken, chatController.startConversation);
router.get('/conversations/:id/messages', verifyToken, chatController.getMessages)
router.post('/conversations/:id/messages', verifyToken, chatController.sendMessage);

module.exports = router;