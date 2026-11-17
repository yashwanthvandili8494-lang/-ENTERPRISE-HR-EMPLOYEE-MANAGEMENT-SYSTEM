const Notification = require('../models/Notification');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const { parsePagination, buildMeta } = require('../utils/pagination');

const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, '-createdAt');
  const filter = { recipient: req.user._id };
  if (req.query.unreadOnly === 'true') {
    filter.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: req.user._id, isRead: false }),
  ]);

  return sendResponse(res, {
    statusCode: 200,
    message: 'Notifications retrieved',
    data: {
      unreadCount,
      notifications,
    },
    meta: buildMeta(total, page, limit),
  });
});

const markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({
    _id: req.params.id,
    recipient: req.user._id,
  });

  if (!notification) {
    throw new ApiError(404, 'Notification not found.');
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  return sendResponse(res, {
    statusCode: 200,
    message: 'Notification marked as read',
    data: notification,
  });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    { recipient: req.user._id, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return sendResponse(res, {
    statusCode: 200,
    message: 'All notifications marked as read',
    data: { modifiedCount: result.modifiedCount },
  });
});

module.exports = { getNotifications, markAsRead, markAllAsRead };
