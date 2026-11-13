const db = require('../config/db');
const { errorResponse } = require('../utils/response');

const requirePremium = async (req, res, next) => {
  try {
    await db.query(
      `UPDATE subscriptions
       SET is_active = 0
       WHERE user_id = ?
         AND is_active = 1
         AND expires_at <= NOW()`,
      [req.user.id]
    );

    const [rows] = await db.query(
      `SELECT * FROM subscriptions
       WHERE user_id = ? AND is_active = 1 AND expires_at > NOW()`,
      [req.user.id]
    );

    if (!rows.length) {
      return res.status(403).json({
        message: 'This feature is exclusively for Premium users. Please upgrade your subscription.',
        isPremium: false,
      });
    }

    req.subscription = rows[0];
    req.user.isPremium = true;
    next();
  } catch (err) {
    console.error('requirePremium error:', err);
    return errorResponse(res, 'Server error.', 500);
  }
};

module.exports = { requirePremium };
