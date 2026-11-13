const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/response');

require('dotenv').config();

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token ||
    req.headers['authorization']?.replace('Bearer ', '');

  if (!token) {
    return errorResponse(res, 'Access denied, please log in first.', 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; 
    next();
  } catch (err) {
    return errorResponse(res, err.message || 'Access denied, please log in first.', err.statusCode || 401);
  }
};

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. This feature is only for ${roles.join(' or ')}.`
      });
    }
    next();
  };
};

const verifySocketToken = (socket, next) => {
  const token = socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace('Bearer ', '');

  if (!token) {
    return next(new Error('Access denied, please log in first.'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Token is invalid.'));
  }
};

module.exports = { verifyToken, requireRole, verifySocketToken };