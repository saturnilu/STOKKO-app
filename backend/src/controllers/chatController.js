const chatModel = require('../models/chatModel');
const { successResponse, errorResponse } = require('../utils/response');

const getConversations = async (req, res) => {
  try {
    const conversations = await chatModel.getConversationsForUser(req.user.id);
    return successResponse(res, 'OK', { conversations });
  } catch (err) {
    console.error('getConversations error:', err);
    return errorResponse(res, 'Server error.', 500);
  }
};

const startConversation = async (req, res) => {
  try {
    if (req.user.role !== 'buyer') {
      return errorResponse(res, 'Only buyers can initiate a new chat.', 403);
    }
    const { seller_id } = req.body;
    if (!seller_id) {
      return errorResponse(res, 'seller_id required.', 400);
    }
    if (Number(seller_id) === req.user.id) {
      return errorResponse(res, 'You cannnot chat with yourself.', 400);
    }
    const conversation = await chatModel.getOrCreateConversation(req.user.id, seller_id);
    return successResponse(res, 'OK', { conversation });
  } catch (err) {
    console.error('startConversation error:', err);
    return errorResponse(res, 'Server error.', 500);
  }
};

const getMessages = async (req, res) => {
  try {
    const conversationId = req.params.id;
    const allowed = await chatModel.isParticipant(conversationId, req.user.id);
    if (!allowed) {
      return errorResponse(res, 'You are not part of this conversation.', 403);
    }

    const messages = await chatModel.getMessages(conversationId);
    await chatModel.markAsRead(conversationId, req.user.id);

    return successResponse(res, 'OK', { messages });
  } catch (err) {
    console.error('getMessages error:', err);
    return errorResponse(res, 'Server error.', 500);
  }
};

const sendMessage = async (req, res) => {
  try {
    const conversationId = req.params.id;
    const { message } = req.body;
    if (!message || !message.trim()) {
      return errorResponse(res, 'The message cannot be empty.', 400);
    }

    const allowed = await chatModel.isParticipant(conversationId, req.user.id);
    if (!allowed) {
      return errorResponse(res, 'You are not part of this conversation.', 403);
    }

    const saved = await chatModel.createMessage(conversationId, req.user.id, message.trim());

    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${conversationId}`).emit('new_message', saved);
    }

    return successResponse(res, 'Message sent.', { message: saved }, 201);
  } catch (err) {
    console.error('sendMessage error:', err);
    return errorResponse(res, 'Server error.', 500);
  }
};

module.exports = { getConversations, startConversation, getMessages, sendMessage };