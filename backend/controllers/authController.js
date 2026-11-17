const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const Employee = require('../models/Employee');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const { recordAudit } = require('../services/auditService');
const { parsePagination, buildMeta } = require('../utils/pagination');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateAccessToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRE,
  });
}

function generateRefreshToken(user) {
  return jwt.sign({ id: user._id }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRE,
  });
}

function setRefreshCookie(res, token) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

function clearRefreshCookie(res) {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/api/auth',
  });
}

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() })
    .select('+password +refreshTokenHash')
    .populate({
      path: 'employee',
      select: 'employeeId firstName lastName email department designation employmentStatus profilePhoto',
      populate: { path: 'department', select: 'name code' },
    });

  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account is deactivated. Please contact your administrator.');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  user.refreshTokenHash = hashToken(refreshToken);
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  setRefreshCookie(res, refreshToken);

  await recordAudit({
    req,
    userId: user._id,
    action: 'USER_LOGIN',
    entityType: 'User',
    entityId: user._id,
    metadata: { email: user.email, role: user.role },
  });

  return sendResponse(res, {
    statusCode: 200,
    message: 'Login successful',
    data: {
      accessToken,
      user: user.toSafeObject(),
    },
  });
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    throw new ApiError(401, 'Refresh token not provided.');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
  } catch (err) {
    clearRefreshCookie(res);
    throw new ApiError(401, 'Invalid or expired refresh token.');
  }

  const user = await User.findById(decoded.id)
    .select('+refreshTokenHash')
    .populate({
      path: 'employee',
      select: 'employeeId firstName lastName email department designation employmentStatus profilePhoto',
      populate: { path: 'department', select: 'name code' },
    });

  if (!user || !user.isActive || user.refreshTokenHash !== hashToken(token)) {
    clearRefreshCookie(res);
    throw new ApiError(401, 'Refresh session is invalid. Please log in again.');
  }

  const newAccessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);
  user.refreshTokenHash = hashToken(newRefreshToken);
  await user.save({ validateBeforeSave: false });

  setRefreshCookie(res, newRefreshToken);

  return sendResponse(res, {
    statusCode: 200,
    message: 'Token refreshed',
    data: {
      accessToken: newAccessToken,
      user: user.toSafeObject(),
    },
  });
});

const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, { refreshTokenHash: null });
    await recordAudit({
      req,
      action: 'USER_LOGOUT',
      entityType: 'User',
      entityId: req.user._id,
    });
  }
  clearRefreshCookie(res);
  return sendResponse(res, {
    statusCode: 200,
    message: 'Logged out successfully',
  });
});

const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate({
    path: 'employee',
    populate: [
      { path: 'department', select: 'name code manager' },
      { path: 'reportingManager', select: 'employeeId firstName lastName designation email' },
    ],
  });

  return sendResponse(res, {
    statusCode: 200,
    message: 'Profile retrieved',
    data: user.toSafeObject(),
  });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const { name, phone, address, emergencyContact } = req.body;
  const user = await User.findById(req.user._id);
  if (name && typeof name === 'string' && name.trim().length >= 2) {
    user.name = name.trim();
    await user.save();
  }

  if (user.employee) {
    const empUpdate = {};
    if (phone) empUpdate.phone = String(phone).trim();
    if (address && typeof address === 'object') empUpdate.address = address;
    if (emergencyContact && typeof emergencyContact === 'object') empUpdate.emergencyContact = emergencyContact;
    if (Object.keys(empUpdate).length > 0) {
      await Employee.findByIdAndUpdate(user.employee, empUpdate, { runValidators: true });
    }
  }

  const updated = await User.findById(req.user._id).populate({
    path: 'employee',
    populate: { path: 'department', select: 'name code' },
  });

  return sendResponse(res, {
    statusCode: 200,
    message: 'Profile updated successfully',
    data: updated.toSafeObject(),
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!user || !(await user.comparePassword(currentPassword))) {
    throw new ApiError(400, 'Current password is incorrect.');
  }

  user.password = newPassword;
  user.refreshTokenHash = null;
  await user.save();

  clearRefreshCookie(res);

  await recordAudit({
    req,
    action: 'PASSWORD_CHANGED',
    entityType: 'User',
    entityId: user._id,
  });

  return sendResponse(res, {
    statusCode: 200,
    message: 'Password updated successfully. Please log in again with your new password.',
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email.toLowerCase() });

  let devResetToken = null;
  if (user && user.isActive) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordTokenHash = hashToken(rawToken);
    user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await user.save({ validateBeforeSave: false });
    if (env.NODE_ENV !== 'production') {
      devResetToken = rawToken;
    }
    await recordAudit({
      req,
      userId: user._id,
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: user._id,
    });
  }

  return sendResponse(res, {
    statusCode: 200,
    message: 'If an active account exists for this email, password reset instructions have been issued.',
    data: devResetToken ? { devResetToken } : null,
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const tokenHash = hashToken(token);

  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+password +resetPasswordTokenHash +resetPasswordExpires');

  if (!user) {
    throw new ApiError(400, 'Password reset token is invalid or has expired.');
  }

  user.password = password;
  user.resetPasswordTokenHash = null;
  user.resetPasswordExpires = null;
  user.refreshTokenHash = null;
  await user.save();

  await recordAudit({
    req,
    userId: user._id,
    action: 'PASSWORD_RESET_COMPLETED',
    entityType: 'User',
    entityId: user._id,
  });

  return sendResponse(res, {
    statusCode: 200,
    message: 'Password has been reset successfully. You may now log in.',
  });
});

// Admin user management
const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = parsePagination(req.query);
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive === 'true') filter.isActive = true;
  if (req.query.isActive === 'false') filter.isActive = false;
  if (req.query.search) {
    const regex = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .populate({ path: 'employee', select: 'employeeId firstName lastName designation department' })
      .sort(sort)
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  return sendResponse(res, {
    statusCode: 200,
    message: 'Users retrieved',
    data: users.map((u) => u.toSafeObject()),
    meta: buildMeta(total, page, limit),
  });
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, employee, isActive } = req.body;
  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'A user with this email already exists.');
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password,
    role,
    employee: employee || null,
    isActive: isActive !== undefined ? isActive : true,
  });

  if (employee) {
    await Employee.findByIdAndUpdate(employee, { user: user._id });
  }

  await recordAudit({
    req,
    action: 'USER_CREATED',
    entityType: 'User',
    entityId: user._id,
    metadata: { email: user.email, role: user.role },
  });

  return sendResponse(res, {
    statusCode: 201,
    message: 'User created successfully',
    data: user.toSafeObject(),
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found.');
  }

  const previousRole = user.role;
  const previousActive = user.isActive;

  if (String(user._id) === String(req.user._id) && req.body.isActive === false) {
    throw new ApiError(400, 'You cannot deactivate your own administrator account.');
  }

  if (req.body.name !== undefined) user.name = req.body.name;
  if (req.body.role !== undefined) user.role = req.body.role;
  if (req.body.isActive !== undefined) {
    user.isActive = req.body.isActive;
    if (!user.isActive) user.refreshTokenHash = null;
  }
  if (req.body.employee !== undefined) user.employee = req.body.employee || null;

  await user.save();

  if (previousRole !== user.role) {
    await recordAudit({
      req,
      action: 'ROLE_CHANGED',
      entityType: 'User',
      entityId: user._id,
      metadata: { from: previousRole, to: user.role },
    });
  } else if (previousActive !== user.isActive) {
    await recordAudit({
      req,
      action: user.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'User',
      entityId: user._id,
    });
  } else {
    await recordAudit({
      req,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: user._id,
    });
  }

  return sendResponse(res, {
    statusCode: 200,
    message: 'User updated successfully',
    data: user.toSafeObject(),
  });
});

module.exports = {
  login,
  refresh,
  logout,
  getMe,
  updateMyProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  listUsers,
  createUser,
  updateUser,
};
