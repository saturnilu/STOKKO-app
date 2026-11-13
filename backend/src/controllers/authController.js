const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
const db = require('../config/db'); 
require('dotenv').config();

const generateTokenAndSetCookie = (res, user) => {
  const payload = { id: user.id, email: user.email, role: user.role };
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return token;
};

const register = async (req, res) => {
  try {
    const { username, email, phone, password, confirm_password, role } = req.body;

    if (!username || !email || !phone || !password || !confirm_password || !role) {
      return res.status(400).json({ message: 'Semua field wajib diisi.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Format email tidak valid.' });
    }

    const phoneRegex = /^[0-9]{10,13}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: 'Nomor HP harus 10-13 digit angka.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password minimal 8 karakter.' });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ message: 'Password dan konfirmasi password tidak cocok.' });
    }

    if (!['buyer', 'seller'].includes(role)) {
      return res.status(400).json({ message: 'Role harus buyer atau seller.' });
    }

    const existingEmail = await userModel.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ message: 'Email sudah terdaftar.' });
    }

    const existingPhone = await userModel.findByPhone(phone);
    if (existingPhone) {
      return res.status(409).json({ message: 'Nomor HP sudah terdaftar.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userId = await userModel.createUser({ username, email, phone, passwordHash, role });

    // Kalau seller, otomatis buat store
    if (role === 'seller') {
      const db = require('../config/db');
      await db.query(
        `INSERT INTO stores (seller_id, name, member_since) VALUES (?, ?, CURDATE())`,
        [userId, username]
      );
    }
    const user = await userModel.findById(userId);

    const token = generateTokenAndSetCookie(res, user);

    return res.status(201).json({
      message: 'Registrasi berhasil.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Email/nomor HP dan password wajib diisi.' });
    }

    const isEmail = identifier.includes('@');
    const user = isEmail
      ? await userModel.findByEmail(identifier)
      : await userModel.findByPhone(identifier);

    if (!user) {
      return res.status(401).json({ message: 'Email/nomor HP atau password salah.' });
    }

    // Akun Google tidak punya password
    if (!user.password_hash) {
      return res.status(401).json({
        message: 'Akun ini terdaftar via Google. Silakan login dengan Google.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email/nomor HP atau password salah.' });
    }

    const token = generateTokenAndSetCookie(res, user);

    return res.status(200).json({
      message: 'Login berhasil.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  return res.status(200).json({ message: 'Logout berhasil.' });
};

const getMe = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }
    return res.status(200).json({ user });
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

const googleCallback = (req, res) => {
  try {
    const user = req.user;
    const token = generateTokenAndSetCookie(res, user);

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5500';

    if (user.role === 'seller') {
      return res.redirect(`${clientUrl}/seller/dashboard/dashboard_seller.html?token=${token}`);
    }
    return res.redirect(`${clientUrl}/buyer/market/dashboard_buyer.html?token=${token}`);
  } catch (err) {
    console.error('Google callback error:', err);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5500';
    return res.redirect(`${clientUrl}/screens/login/login_email.html?error=oauth_failed`);
  }
};

const switchRole = async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }
    const user = rows[0];
    const newRole = user.role === 'seller' ? 'buyer' : 'seller';

    // Kalau baru switch jadi seller & belum punya store, bikinin store default
    if (newRole === 'seller') {
      const [stores] = await db.query('SELECT * FROM stores WHERE seller_id = ?', [userId]);
      if (stores.length === 0) {
        await db.query(
          `INSERT INTO stores (seller_id, name, member_since)
           VALUES (?, ?, CURDATE())`,
          [userId, `${user.username}'s Store`]
        );
      }
    }

    await db.query('UPDATE users SET role = ? WHERE id = ?', [newRole, userId]);

    const updatedUser = await userModel.findById(userId); // findById udah nggak nyertain password_hash

    const token = generateTokenAndSetCookie(res, updatedUser);

    return res.status(200).json({ user: updatedUser, token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Terjadi kesalahan server.' });
  }
};

// PUT /api/auth/me — update username, email, phone, avatar milik sendiri
const updateProfile = async (req, res) => {
  try {
    const { username, email, phone } = req.body;
    const avatarUrl = req.file ? req.file.path : undefined;

    if (!username && !email && !phone && !avatarUrl) {
      return res.status(400).json({ message: 'Tidak ada data yang diupdate.' });
    }

    if (email) {
      const existing = await userModel.findByEmail(email);
      if (existing && existing.id !== req.user.id) {
        return res.status(409).json({ message: 'Email sudah dipakai akun lain.' });
      }
    }
    if (phone) {
      const existing = await userModel.findByPhone(phone);
      if (existing && existing.id !== req.user.id) {
        return res.status(409).json({ message: 'Nomor HP sudah dipakai akun lain.' });
      }
    }

    const updatedUser = await userModel.updateProfile(req.user.id, { username, email, phone, avatarUrl });
    if (!updatedUser) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }

    const token = generateTokenAndSetCookie(res, updatedUser);

    return res.status(200).json({
      message: 'Profil berhasil diupdate.',
      token,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        avatar_url: updatedUser.avatar_url,
      },
    });
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = { register, login, logout, getMe, googleCallback, switchRole, updateProfile };