const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const ApiError = require('../utils/ApiError');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');

const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];

function createUploader(subDir, allowedMimes = ALLOWED_DOC_MIME, maxSizeBytes = 5 * 1024 * 1024) {
  const dest = path.join(UPLOAD_ROOT, subDir);
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
      const unique = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
      cb(null, unique);
    },
  });

  const fileFilter = (req, file, cb) => {
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new ApiError(400, `Unsupported file type: ${file.mimetype}`));
    }
    return cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: maxSizeBytes },
  });
}

module.exports = {
  UPLOAD_ROOT,
  ALLOWED_IMAGE_MIME,
  ALLOWED_DOC_MIME,
  createUploader,
  uploadProfilePhoto: createUploader('profiles', ALLOWED_IMAGE_MIME, 3 * 1024 * 1024),
  uploadEmployeeDoc: createUploader('documents', ALLOWED_DOC_MIME, 5 * 1024 * 1024),
  uploadLeaveDoc: createUploader('leaves', ALLOWED_DOC_MIME, 5 * 1024 * 1024),
  uploadResume: createUploader('resumes', ALLOWED_DOC_MIME, 5 * 1024 * 1024),
  uploadCompanyLogo: createUploader('logos', ALLOWED_IMAGE_MIME, 2 * 1024 * 1024),
};
