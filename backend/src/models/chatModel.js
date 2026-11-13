const db = require('../config/db');

const getOrCreateConversation = async (buyerId, sellerId) => {
  await db.query(
    `INSERT INTO conversations (buyer_id, seller_id)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE id = id`,
    [buyerId, sellerId]
  );

  const [rows] = await db.query(
    `SELECT * FROM conversations WHERE buyer_id = ? AND seller_id = ?`,
    [buyerId, sellerId]
  );
  return rows[0];
};

const isParticipant = async (conversationId, userId) => {
  const [rows] = await db.query(
    `SELECT id FROM conversations WHERE id = ? AND (buyer_id = ? OR seller_id = ?)`,
    [conversationId, userId, userId]
  );
  return rows.length > 0;
};

const getConversationsForUser = async (userId) => {
  const [rows] = await db.query(
    `SELECT
        c.id,
        c.buyer_id,
        c.seller_id,
        c.updated_at,
        CASE WHEN c.buyer_id = ? THEN c.seller_id ELSE c.buyer_id END AS other_user_id,
        CASE WHEN c.buyer_id = ? THEN COALESCE(s.name, u_seller.username) ELSE u_buyer.username END AS other_user_name,
        CASE WHEN c.buyer_id = ? THEN s.logo_url ELSE NULL END AS other_user_avatar,
        lm.message AS last_message,
        lm.created_at AS last_message_at,
        lm.sender_id AS last_message_sender_id,
        (
          SELECT COUNT(*) FROM messages m
          WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.is_read = 0
        ) AS unread_count
     FROM conversations c
     LEFT JOIN users u_buyer  ON c.buyer_id  = u_buyer.id
     LEFT JOIN users u_seller ON c.seller_id = u_seller.id
     LEFT JOIN stores s       ON c.seller_id = s.seller_id
     LEFT JOIN messages lm ON lm.id = (
       SELECT id FROM messages
       WHERE conversation_id = c.id
       ORDER BY created_at DESC
       LIMIT 1
     )
     WHERE c.buyer_id = ? OR c.seller_id = ?
     ORDER BY COALESCE(lm.created_at, c.created_at) DESC`,
    [userId, userId, userId, userId, userId, userId]
  );
  return rows;
};

const getMessages = async (conversationId) => {
  const [rows] = await db.query(
    `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
    [conversationId]
  );
  return rows;
};

const createMessage = async (conversationId, senderId, message) => {
  const [result] = await db.query(
    `INSERT INTO messages (conversation_id, sender_id, message) VALUES (?, ?, ?)`,
    [conversationId, senderId, message]
  );
  await db.query(`UPDATE conversations SET updated_at = NOW() WHERE id = ?`, [conversationId]);

  const [rows] = await db.query(`SELECT * FROM messages WHERE id = ?`, [result.insertId]);
  return rows[0];
};

const markAsRead = async (conversationId, userId) => {
  await db.query(
    `UPDATE messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ? AND is_read = 0`,
    [conversationId, userId]
  );
};

module.exports = {
  getOrCreateConversation,
  isParticipant,
  getConversationsForUser,
  getMessages,
  createMessage,
  markAsRead,
};