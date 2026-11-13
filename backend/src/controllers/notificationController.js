const notifModel = require('../models/notificationModel');
const { successResponse, errorResponse } = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const notifications = await notifModel.getByUser(req.user.id);
    const unreadCount   = notifications.filter(n => !n.is_read).length;
    return successResponse(res, 'OK', { notifications, unreadCount });
  } catch (err) {
    console.error('getAll notif error:', err);
    return errorResponse(res, 'Server error.', 500);
  }
};

const markRead = async (req, res) => {
  try {
    const updated = await notifModel.markRead(req.params.id, req.user.id);
    if (!updated) return errorResponse(res, 'Notification not found.', 404);
    return successResponse(res, 'Notification marked as read.');
  } catch (err) {
    console.error('markRead error:', err);
    return errorResponse(res, 'Server error.', 500);
  }
};

const markAllRead = async (req, res) => {
  try {
    await notifModel.markAllRead(req.user.id);
    return successResponse(res, 'All notifications marked as read.');
  } catch (err) {
    console.error('markAllRead error:', err);
    return errorResponse(res, 'Server error.', 500);
  }
};

const remove = async (req, res) => {
  try {
    const deleted = await notifModel.remove(req.params.id, req.user.id);
    if (!deleted) return errorResponse(res, 'Notification not found.', 404);
    return successResponse(res, 'Notification successfully deleted.');
  } catch (err) {
    console.error('remove notif error:', err);
    return errorResponse(res, 'Server error.', 500);
  }
};

module.exports = { getAll, markRead, markAllRead, remove };