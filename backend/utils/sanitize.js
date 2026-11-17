/**
 * Recursively strips MongoDB operator injection keys ($...) and prototype pollution keys.
 */
function sanitizeObject(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item));
  }
  const clean = {};
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    const val = obj[key];
    clean[key] = typeof val === 'object' && val !== null ? sanitizeObject(val) : val;
  }
  return clean;
}

function sanitizeMiddleware(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
}

module.exports = { sanitizeObject, sanitizeMiddleware };
