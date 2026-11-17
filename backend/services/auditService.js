const AuditLog = require('../models/AuditLog');

async function recordAudit({ req = null, userId = null, action, entityType, entityId = null, metadata = {} }) {
  try {
    await AuditLog.create({
      user: userId || req?.user?._id || null,
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      metadata,
      ipAddress: req ? req.ip || req.headers?.['x-forwarded-for'] || '' : '',
      userAgent: req ? req.headers?.['user-agent'] || '' : '',
    });
  } catch (err) {
    // Audit logging should never crash a valid business transaction
    if (process.env.NODE_ENV !== 'test') {
      console.error('Audit log write failed:', err.message);
    }
  }
}

module.exports = { recordAudit };
