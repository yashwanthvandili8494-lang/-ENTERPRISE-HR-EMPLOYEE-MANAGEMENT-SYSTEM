const path = require('path');
const fs = require('fs');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { ROLES } = require('../utils/constants');
const { toCsv } = require('../utils/csv');
const { recordAudit } = require('../services/auditService');
const { notifyHRAndAdmins, notifyUsers } = require('../services/notificationService');
const { ensureLeaveBalance } = require('../services/leaveBalanceService');
const { UPLOAD_ROOT } = require('../middleware/upload');

function canViewSalary(reqUser, employeeObj) {
  if ([ROLES.SUPER_ADMIN, ROLES.HR_MANAGER].includes(reqUser.role)) return true;
  if (reqUser.employee && String(reqUser.employee._id) === String(employeeObj._id)) return true;
  return false;
}

function stripSensitiveEmployeeFields(reqUser, employeeDoc) {
  const obj = typeof employeeDoc.toObject === 'function' ? employeeDoc.toObject() : { ...employeeDoc };
  if (!canViewSalary(reqUser, obj)) {
    delete obj.salary;
    delete obj.documents;
  }
  return obj;
}

const getEmployees = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = parsePagination(req.query, '-createdAt');
  const filter = {};

  // Role scoping
  if (req.user.role === ROLES.EMPLOYEE) {
    if (!req.user.employee?._id) {
      return sendResponse(res, { statusCode: 200, data: [], meta: buildMeta(0, page, limit) });
    }
    filter._id = req.user.employee._id;
  } else if (req.user.role === ROLES.DEPARTMENT_MANAGER) {
    filter.department = { $in: req.managedDepartmentIds };
  }

  if (req.query.department) {
    if (req.user.role === ROLES.DEPARTMENT_MANAGER) {
      const allowed = req.managedDepartmentIds.map(String);
      if (!allowed.includes(String(req.query.department))) {
        return sendResponse(res, { statusCode: 200, data: [], meta: buildMeta(0, page, limit) });
      }
    }
    filter.department = req.query.department;
  }

  if (req.query.designation) {
    filter.designation = new RegExp(req.query.designation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }

  if (req.query.employmentStatus) {
    filter.employmentStatus = req.query.employmentStatus;
  }

  if (req.query.employmentType) {
    filter.employmentType = req.query.employmentType;
  }

  if (req.query.search) {
    const regex = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { employeeId: regex },
      { designation: regex },
      { phone: regex },
    ];
  }

  const [employees, total] = await Promise.all([
    Employee.find(filter)
      .populate('department', 'name code')
      .populate('reportingManager', 'employeeId firstName lastName designation')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Employee.countDocuments(filter),
  ]);

  const sanitized = employees.map((emp) => stripSensitiveEmployeeFields(req.user, emp));

  return sendResponse(res, {
    statusCode: 200,
    message: 'Employees retrieved',
    data: sanitized,
    meta: buildMeta(total, page, limit),
  });
});

const exportEmployeesCsv = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.department) filter.department = req.query.department;
  if (req.query.employmentStatus) filter.employmentStatus = req.query.employmentStatus;

  const employees = await Employee.find(filter)
    .populate('department', 'name code')
    .populate('reportingManager', 'firstName lastName')
    .sort('employeeId')
    .lean();

  const csv = toCsv(
    [
      { label: 'Employee ID', key: 'employeeId' },
      { label: 'First Name', key: 'firstName' },
      { label: 'Last Name', key: 'lastName' },
      { label: 'Email', key: 'email' },
      { label: 'Phone', key: 'phone' },
      { label: 'Department', value: (r) => r.department?.name || '' },
      { label: 'Designation', key: 'designation' },
      { label: 'Employment Type', key: 'employmentType' },
      { label: 'Status', key: 'employmentStatus' },
      { label: 'Joining Date', value: (r) => (r.joiningDate ? new Date(r.joiningDate).toISOString().slice(0, 10) : '') },
      {
        label: 'Reporting Manager',
        value: (r) => (r.reportingManager ? `${r.reportingManager.firstName} ${r.reportingManager.lastName}` : ''),
      },
    ],
    employees
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="employees-export.csv"');
  return res.status(200).send(csv);
});

const getEmployeeById = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id)
    .populate('department', 'name code manager')
    .populate('reportingManager', 'employeeId firstName lastName designation email')
    .populate('user', 'email role isActive lastLogin');

  if (!employee) {
    throw new ApiError(404, 'Employee not found.');
  }

  // Enforce RBAC visibility
  if (req.user.role === ROLES.EMPLOYEE) {
    if (!req.user.employee || String(req.user.employee._id) !== String(employee._id)) {
      throw new ApiError(403, 'You can only view your own employee profile.');
    }
  } else if (req.user.role === ROLES.DEPARTMENT_MANAGER) {
    const allowedDeptIds = req.managedDepartmentIds.map(String);
    const isSelf = req.user.employee && String(req.user.employee._id) === String(employee._id);
    if (!isSelf && !allowedDeptIds.includes(String(employee.department?._id))) {
      throw new ApiError(403, 'You can only view employees in your managed department(s).');
    }
  }

  const [attendanceHistory, leaveHistory, leaveBalance] = await Promise.all([
    Attendance.find({ employee: employee._id }).sort({ date: -1 }).limit(30).lean(),
    Leave.find({ employee: employee._id })
      .populate('approvedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    ensureLeaveBalance(employee._id, new Date().getUTCFullYear()),
  ]);

  const safeEmployee = stripSensitiveEmployeeFields(req.user, employee);

  return sendResponse(res, {
    statusCode: 200,
    message: 'Employee profile retrieved',
    data: {
      ...safeEmployee,
      canViewSalary: canViewSalary(req.user, employee),
      attendanceHistory,
      leaveHistory,
      leaveBalance,
    },
  });
});

const createEmployee = asyncHandler(async (req, res) => {
  const data = req.body;

  const dept = await Department.findById(data.department);
  if (!dept || !dept.isActive) {
    throw new ApiError(400, 'Selected department does not exist or is inactive.');
  }

  const dup = await Employee.findOne({
    $or: [{ email: data.email.toLowerCase() }, { employeeId: data.employeeId.toUpperCase() }],
  });
  if (dup) {
    throw new ApiError(409, 'An employee with this email or Employee ID already exists.');
  }

  const employee = await Employee.create({
    employeeId: data.employeeId.toUpperCase(),
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email.toLowerCase(),
    phone: data.phone,
    gender: data.gender,
    dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
    address: data.address || {},
    department: data.department,
    designation: data.designation,
    joiningDate: new Date(data.joiningDate),
    employmentType: data.employmentType,
    reportingManager: data.reportingManager || null,
    salary: data.salary || {},
    employmentStatus: data.employmentStatus || 'Active',
    emergencyContact: data.emergencyContact || {},
  });

  // Initialize leave balance for current year
  await ensureLeaveBalance(employee._id, new Date().getUTCFullYear());

  // Optionally provision user login account
  let createdUser = null;
  if (data.createUserAccount) {
    if (!data.accountPassword) {
      throw new ApiError(400, 'Account password is required when creating a user login account.');
    }
    const existingUser = await User.findOne({ email: employee.email });
    if (!existingUser) {
      createdUser = await User.create({
        name: `${employee.firstName} ${employee.lastName}`.trim(),
        email: employee.email,
        password: data.accountPassword,
        role: data.accountRole || ROLES.EMPLOYEE,
        employee: employee._id,
        isActive: employee.employmentStatus === 'Active',
      });
      employee.user = createdUser._id;
      await employee.save();
    }
  }

  await recordAudit({
    req,
    action: 'EMPLOYEE_CREATED',
    entityType: 'Employee',
    entityId: employee._id,
    metadata: { employeeId: employee.employeeId, email: employee.email, department: dept.name },
  });

  await notifyHRAndAdmins({
    type: 'EMPLOYEE_ADDED',
    title: 'New Employee Added',
    message: `${employee.firstName} ${employee.lastName} (${employee.employeeId}) joined ${dept.name} as ${employee.designation}.`,
    link: `/employees/${employee._id}`,
  });

  if (createdUser) {
    await notifyUsers([createdUser._id], {
      type: 'EMPLOYEE_ADDED',
      title: 'Welcome to the Enterprise HR Portal',
      message: `Your employee profile (${employee.employeeId}) is active. You can now check in, view leave balances, and access payslips.`,
      link: '/dashboard',
    });
  }

  const populated = await Employee.findById(employee._id)
    .populate('department', 'name code')
    .populate('reportingManager', 'employeeId firstName lastName designation');

  return sendResponse(res, {
    statusCode: 201,
    message: 'Employee created successfully',
    data: populated,
  });
});

const updateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    throw new ApiError(404, 'Employee not found.');
  }

  const data = req.body;

  if (data.email && data.email.toLowerCase() !== employee.email) {
    const exists = await Employee.findOne({ email: data.email.toLowerCase(), _id: { $ne: employee._id } });
    if (exists) throw new ApiError(409, 'Email is already in use by another employee.');
  }

  if (data.employeeId && data.employeeId.toUpperCase() !== employee.employeeId) {
    const exists = await Employee.findOne({ employeeId: data.employeeId.toUpperCase(), _id: { $ne: employee._id } });
    if (exists) throw new ApiError(409, 'Employee ID is already in use.');
  }

  if (data.department) {
    const dept = await Department.findById(data.department);
    if (!dept) throw new ApiError(400, 'Selected department does not exist.');
  }

  const updatable = [
    'employeeId',
    'firstName',
    'lastName',
    'email',
    'phone',
    'gender',
    'dateOfBirth',
    'address',
    'department',
    'designation',
    'joiningDate',
    'employmentType',
    'reportingManager',
    'salary',
    'employmentStatus',
    'emergencyContact',
  ];

  updatable.forEach((field) => {
    if (data[field] !== undefined) {
      if (field === 'employeeId') employee[field] = String(data[field]).toUpperCase();
      else if (field === 'email') employee[field] = String(data[field]).toLowerCase();
      else if (field === 'reportingManager') employee[field] = data[field] || null;
      else if (field === 'dateOfBirth') employee[field] = data[field] ? new Date(data[field]) : null;
      else if (field === 'joiningDate') employee[field] = new Date(data[field]);
      else employee[field] = data[field];
    }
  });

  await employee.save();

  if (employee.user) {
    const userUpdates = {
      name: `${employee.firstName} ${employee.lastName}`.trim(),
      email: employee.email,
    };
    if (data.employmentStatus) {
      userUpdates.isActive = data.employmentStatus !== 'Inactive' && data.employmentStatus !== 'Terminated';
    }
    await User.findByIdAndUpdate(employee.user, userUpdates);
  }

  await recordAudit({
    req,
    action: 'EMPLOYEE_UPDATED',
    entityType: 'Employee',
    entityId: employee._id,
    metadata: { employeeId: employee.employeeId, updatedFields: Object.keys(data) },
  });

  const populated = await Employee.findById(employee._id)
    .populate('department', 'name code')
    .populate('reportingManager', 'employeeId firstName lastName designation');

  return sendResponse(res, {
    statusCode: 200,
    message: 'Employee updated successfully',
    data: populated,
  });
});

const deactivateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    throw new ApiError(404, 'Employee not found.');
  }

  employee.employmentStatus = 'Inactive';
  employee.deactivatedAt = new Date();
  await employee.save();

  if (employee.user) {
    await User.findByIdAndUpdate(employee.user, { isActive: false, refreshTokenHash: null });
  }

  await recordAudit({
    req,
    action: 'EMPLOYEE_DEACTIVATED',
    entityType: 'Employee',
    entityId: employee._id,
    metadata: { employeeId: employee.employeeId, email: employee.email },
  });

  return sendResponse(res, {
    statusCode: 200,
    message: 'Employee deactivated successfully',
    data: employee,
  });
});

const reactivateEmployee = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) {
    throw new ApiError(404, 'Employee not found.');
  }

  employee.employmentStatus = 'Active';
  employee.deactivatedAt = null;
  await employee.save();

  if (employee.user) {
    await User.findByIdAndUpdate(employee.user, { isActive: true });
  }

  await recordAudit({
    req,
    action: 'EMPLOYEE_REACTIVATED',
    entityType: 'Employee',
    entityId: employee._id,
    metadata: { employeeId: employee.employeeId },
  });

  return sendResponse(res, {
    statusCode: 200,
    message: 'Employee reactivated successfully',
    data: employee,
  });
});

const uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Profile photo file is required.');
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw new ApiError(404, 'Employee not found.');

  const isSelf = req.user.employee && String(req.user.employee._id) === String(employee._id);
  if (!isSelf && ![ROLES.SUPER_ADMIN, ROLES.HR_MANAGER].includes(req.user.role)) {
    throw new ApiError(403, 'Not authorized to update this profile photo.');
  }

  employee.profilePhoto = `/uploads/profiles/${req.file.filename}`;
  await employee.save();

  return sendResponse(res, {
    statusCode: 200,
    message: 'Profile photo uploaded',
    data: { profilePhoto: employee.profilePhoto },
  });
});

const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Document file is required.');
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw new ApiError(404, 'Employee not found.');

  const docEntry = {
    name: req.body.name || req.file.originalname,
    type: req.body.type || 'General',
    filePath: `documents/${req.file.filename}`,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedBy: req.user._id,
    uploadedAt: new Date(),
  };

  employee.documents.push(docEntry);
  await employee.save();

  await recordAudit({
    req,
    action: 'EMPLOYEE_DOCUMENT_UPLOADED',
    entityType: 'Employee',
    entityId: employee._id,
    metadata: { documentName: docEntry.name },
  });

  return sendResponse(res, {
    statusCode: 201,
    message: 'Document uploaded successfully',
    data: employee.documents[employee.documents.length - 1],
  });
});

const downloadDocument = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.params.id);
  if (!employee) throw new ApiError(404, 'Employee not found.');

  if (!canViewSalary(req.user, employee)) {
    throw new ApiError(403, 'You are not authorized to access private employee documents.');
  }

  const doc = employee.documents.id(req.params.docId);
  if (!doc) throw new ApiError(404, 'Document not found.');

  const absPath = path.resolve(UPLOAD_ROOT, doc.filePath);
  if (!absPath.startsWith(path.resolve(UPLOAD_ROOT)) || !fs.existsSync(absPath)) {
    throw new ApiError(404, 'Document file is no longer available on disk.');
  }

  return res.download(absPath, doc.name);
});

module.exports = {
  getEmployees,
  exportEmployeesCsv,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deactivateEmployee,
  reactivateEmployee,
  uploadPhoto,
  uploadDocument,
  downloadDocument,
};
