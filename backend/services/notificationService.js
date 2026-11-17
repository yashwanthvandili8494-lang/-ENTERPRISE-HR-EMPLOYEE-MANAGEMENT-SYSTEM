const Notification = require('../models/Notification');
const User = require('../models/User');
const { getCompanySettings } = require('./settingsService');
const { ROLES } = require('../utils/constants');

async function notifyUsers(recipientIds, { type = 'SYSTEM', title, message, link = '', metadata = {} }) {
  try {
    const settings = await getCompanySettings();
    if (settings?.notificationPreferences?.inAppEnabled === false) {
      return [];
    }

    const uniqueIds = [...new Set(recipientIds.filter(Boolean).map((id) => String(id)))];
    if (uniqueIds.length === 0) return [];

    const docs = uniqueIds.map((recipient) => ({
      recipient,
      type,
      title,
      message,
      link,
      metadata,
    }));

    return await Notification.insertMany(docs);
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Notification dispatch failed:', err.message);
    }
    return [];
  }
}

async function notifyRoles(roles, payload) {
  const users = await User.find({ role: { $in: roles }, isActive: true }).select('_id');
  return notifyUsers(
    users.map((u) => u._id),
    payload
  );
}

async function notifyHRAndAdmins(payload) {
  return notifyRoles([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER], payload);
}

module.exports = { notifyUsers, notifyRoles, notifyHRAndAdmins };
