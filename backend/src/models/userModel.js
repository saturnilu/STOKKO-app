const db = require('../config/db');

const findByEmail = async (email) => {
  const [rows] = await db.query(
    'SELECT * FROM users WHERE email = ?',
    [email]
  );
  return rows[0] || null;
};

const findByPhone = async (phone) => {
  const [rows] = await db.query(
    'SELECT * FROM users WHERE phone = ?',
    [phone]
  );
  return rows[0] || null;
};

const findById = async (id) => {
  const [rows] = await db.query(
    'SELECT id, username, email, phone, role, is_premium, avatar_url, google_id, created_at FROM users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
};

const createUser = async ({ username, email, phone, passwordHash, role }) => {
  const [result] = await db.query(
    `INSERT INTO users (username, email, phone, password_hash, role)
     VALUES (?, ?, ?, ?, ?)`,
    [username, email, phone, passwordHash, role]
  );
  return result.insertId;
};

const updateProfile = async (userId, { username, email, phone, avatarUrl }) => {
  const fields = [];
  const values = [];
  if (username !== undefined)  { fields.push('username = ?');   values.push(username); }
  if (email !== undefined)     { fields.push('email = ?');      values.push(email); }
  if (phone !== undefined)     { fields.push('phone = ?');      values.push(phone); }
  if (avatarUrl !== undefined) { fields.push('avatar_url = ?'); values.push(avatarUrl); }
  if (!fields.length) return findById(userId);

  values.push(userId);
  await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
  return findById(userId);
};

module.exports = { findByEmail, findByPhone, findById, createUser, updateProfile };