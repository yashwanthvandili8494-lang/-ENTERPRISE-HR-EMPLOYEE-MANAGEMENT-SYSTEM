const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const { getCompanySettings } = require('../services/settingsService');
const { recordAudit } = require('../services/auditService');

const getSettings = asyncHandler(async (req, res) => {
  const settings = await getCompanySettings();
  return sendResponse(res, {
    statusCode: 200,
    message: 'Company settings retrieved',
    data: settings,
  });
});

const updateSettings = asyncHandler(async (req, res) => {
  const settings = await getCompanySettings();
  const allowed = [
    'companyName',
    'address',
    'phone',
    'officialEmail',
    'website',
    'timezone',
    'workingDays',
    'workingHours',
    'leavePolicies',
    'notificationPreferences',
  ];

  allowed.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (
        typeof req.body[field] === 'object' &&
        !Array.isArray(req.body[field]) &&
        req.body[field] !== null &&
        settings[field]
      ) {
        settings[field] = { ...settings[field].toObject(), ...req.body[field] };
      } else {
        settings[field] = req.body[field];
      }
    }
  });

  await settings.save();

  await recordAudit({
    req,
    action: 'SETTINGS_UPDATED',
    entityType: 'CompanySettings',
    entityId: settings._id,
    metadata: { updatedKeys: Object.keys(req.body) },
  });

  return sendResponse(res, {
    statusCode: 200,
    message: 'Company settings updated successfully',
    data: settings,
  });
});

const uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Logo image file is required.');
  const settings = await getCompanySettings();
  settings.logoPath = `/uploads/logos/${req.file.filename}`;
  await settings.save();

  await recordAudit({
    req,
    action: 'COMPANY_LOGO_UPDATED',
    entityType: 'CompanySettings',
    entityId: settings._id,
  });

  return sendResponse(res, {
    statusCode: 200,
    message: 'Company logo updated successfully',
    data: settings,
  });
});

module.exports = { getSettings, updateSettings, uploadLogo };
