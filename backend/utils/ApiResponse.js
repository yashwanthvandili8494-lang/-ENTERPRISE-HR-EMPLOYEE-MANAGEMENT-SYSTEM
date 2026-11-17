const sendResponse = (res, { statusCode = 200, message = 'Success', data = null, meta = null }) => {
  const payload = {
    success: statusCode >= 200 && statusCode < 300,
    message,
    data,
  };
  if (meta) {
    payload.meta = meta;
  }
  return res.status(statusCode).json(payload);
};

module.exports = { sendResponse };
