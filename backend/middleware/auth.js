const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const Department = require('../models/Department');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES } = require('../utils/constants');

const protect = asyncHandler(async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    throw new ApiError(401, 'Authentication required. Please log in.');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired authentication token.');
  }

  const user = await User.findById(decoded.id).populate({
    path: 'employee',
    select: 'employeeId firstName lastName email department designation employmentStatus profilePhoto',
    populate: { path: 'department', select: 'name code manager' },
  });

  if (!user) {
    throw new ApiError(401, 'User account no longer exists.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Contact an administrator.');
  }

  req.user = user;

  // For Department Managers, pre-resolve managed department IDs
  if (user.role === ROLES.DEPARTMENT_MANAGER) {
    const managedDepts = await Department.find({
      $or: [
        ...(user.employee?._id ? [{ manager: user.employee._id }] : []),
        ...(user.employee?.department?._id ? [{ _id: user.employee.department._id }] : []),
      ],
      isActive: true,
    }).select('_id');
    req.managedDepartmentIds = managedDepts.map((d) => d._id);
  } else {
    req.managedDepartmentIds = [];
  }

  next();
});

const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return next(new ApiError(401, 'Authentication required.'));
  }
  if (!allowedRoles.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have permission to perform this action.'));
  }
  return next();
};

module.exports = { protect, authorize };
