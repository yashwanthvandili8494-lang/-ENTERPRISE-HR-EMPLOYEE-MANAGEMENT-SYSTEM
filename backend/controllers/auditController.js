const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const { parsePagination, buildMeta } = require('../utils/pagination');

const getAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, '-createdAt');
  const filter = {};

  if (req.query.entityType) filter.entityType = req.query.entityType;
  if (req.query.action) {
    filter.action = new RegExp(req.query.action.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
  if (req.query.user) filter.user = req.query.user;
  if (req.query.startDate || req.query.endDate) {
    filter.createdAt = {};
    if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
    if (req.query.endDate) filter.createdAt.$lte = new Date(`${req.query.endDate}T23:59:59.999Z`);
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return sendResponse(res, {
    statusCode: 200,
    message: 'Audit logs retrieved',
    data: logs,
    meta: buildMeta(total, page, limit),
  });
});

module.exports = { getAuditLogs };
