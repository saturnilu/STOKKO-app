const { verifySocketToken } = require('../middleware/auth');
const chatModel = require('../models/chatModel');

const initChatSocket = (io) => {
  io.use(verifySocketToken);

  io.on('connection', (socket) => {
    socket.join(`user_${socket.user.id}`);

    socket.on('join_conversation', async (conversationId, callback) => {
      try {
        const allowed = await chatModel.isParticipant(conversationId, socket.user.id);
        if (!allowed) {
          socket.emit('error_message', 'You are not part of this conversation.');
          if (callback) callback({ ok: false });
          return;
        }
        socket.join(`conversation_${conversationId}`);
        await chatModel.markAsRead(conversationId, socket.user.id);
        if (callback) callback({ ok: true });
      } catch (err) {
        console.error('join_conversation error:', err);
        if (callback) callback({ ok: false });
      }
    });

    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
    });

    socket.on('send_message', async ({ conversationId, message }, callback) => {
      try {
        if (!conversationId || !message || !message.trim()) {
          if (callback) callback({ ok: false, error: 'The message cannot be empty.' });
          return;
        }

        const allowed = await chatModel.isParticipant(conversationId, socket.user.id);
        if (!allowed) {
          if (callback) callback({ ok: false, error: 'You are not part of this conversation.' });
          return;
        }

        const saved = await chatModel.createMessage(conversationId, socket.user.id, message.trim());

        io.to(`conversation_${conversationId}`).emit('new_message', saved);
        if (callback) callback({ ok: true, message: saved });
      } catch (err) {
        console.error('send_message socket error:', err);
        if (callback) callback({ ok: false, error: 'Failed to send message.' });
      }
    });

    socket.on('typing', ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation_${conversationId}`).emit('user_typing', { userId: socket.user.id });
    });
  });
};

module.exports = initChatSocket;