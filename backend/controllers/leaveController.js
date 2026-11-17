const path = require('path');
const fs = require('fs');
const Leave = require('../models/Leave');
const LeaveBalance = require('../models/LeaveBalance');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { ROLES, LEAVE_TYPE_KEY_MAP } = require('../utils/constants');
const { runWithTransaction } = require('../utils/transaction');
const { ensureLeaveBalance } = require('../services/leaveBalanceService');
const { notifyUsers, notifyHRAndAdmins } = require('../services/notificationService');
const { recordAudit } = require('../services/auditService');
const { UPLOAD_ROOT } = require('../middleware/upload');

function calculateLeaveDays(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  s.setUTCHours(0, 0, 0, 0);
  e.setUTCHours(0, 0, 0, 0);
  const diffDays = Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

const applyLeave = asyncHandler(async (req, res) => {
  if (!req.user.employee?._id) {
    throw new ApiError(400, 'Your account is not linked to an employee profile.');
  }

  const { leaveType, startDate, endDate, reason } = req.body;
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ApiError(400, 'Invalid start or end date.');
  }

  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);

  if (end < start) {
    throw new ApiError(400, 'End date cannot be earlier than start date.');
  }

  const totalDays = calculateLeaveDays(startDate, endDate);
  if (totalDays <= 0) {
    throw new ApiError(400, 'Leave duration must be at least 1 day.');
  }

  const employeeId = req.user.employee._id;

  // Prevent overlapping leave requests (Pending or Approved)
  const overlap = await Leave.findOne({
    employee: employeeId,
    status: { $in: ['Pending', 'Approved'] },
    startDate: { $lte: end },
    endDate: { $gte: start },
  });

  if (overlap) {
    throw new ApiError(409, 'You already have an overlapping pending or approved leave request for these dates.');
  }

  const year = start.getUTCFullYear();
  const bucketKey = LEAVE_TYPE_KEY_MAP[leaveType];

  const supportingDocument = req.file
    ? {
        fileName: req.file.originalname,
        filePath: `leaves/${req.file.filename}`,
        mimeType: req.file.mimetype,
      }
    : undefined;

  const createdLeave = await runWithTransaction(async (session) => {
    const balance = await ensureLeaveBalance(employeeId, year, session);
    const bucket = balance.balances[bucketKey];
    const available = bucket.allocated - bucket.used - bucket.pending;

    if (leaveType !== 'Unpaid Leave' && totalDays > available) {
      throw new ApiError(
        400,
        `Insufficient ${leaveType} balance. Requested ${totalDays} day(s), available: ${Math.max(0, available)} day(s).`
      );
    }

    bucket.pending += totalDays;
    await balance.save(session ? { session } : {});

    const leaveDoc = {
      employee: employeeId,
      leaveType,
      startDate: start,
      endDate: end,
      totalDays,
      reason,
      ...(supportingDocument ? { supportingDocument } : {}),
      status: 'Pending',
      approvalHistory: [
        {
          action: 'SUBMITTED',
          by: req.user._id,
          role: req.user.role,
          comment: reason,
          at: new Date(),
        },
      ],
    };

    const [saved] = session ? await Leave.create([leaveDoc], { session }) : [await Leave.create(leaveDoc)];
    return saved;
  });

  // Notify HR/Admin and Department Manager
  const emp = await Employee.findById(employeeId).populate('department');
  const notifyIds = [];
  if (emp?.department?.manager) {
    const mgrUser = await User.findOne({ employee: emp.department.manager, isActive: true }).select('_id');
    if (mgrUser) notifyIds.push(mgrUser._id);
  }
  if (notifyIds.length > 0) {
    await notifyUsers(notifyIds, {
      type: 'LEAVE_SUBMITTED',
      title: 'Team Leave Request Submitted',
      message: `${emp.firstName} ${emp.lastName} requested ${totalDays} day(s) of ${leaveType}.`,
      link: '/leaves',
    });
  }
  await notifyHRAndAdmins({
    type: 'LEAVE_SUBMITTED',
    title: 'New Leave Request',
    message: `${emp.firstName} ${emp.lastName} (${emp.employeeId}) requested ${totalDays} day(s) of ${leaveType}.`,
    link: '/leaves',
  });

  await recordAudit({
    req,
    action: 'LEAVE_SUBMITTED',
    entityType: 'Leave',
    entityId: createdLeave._id,
    metadata: { leaveType, totalDays, startDate, endDate },
  });

  return sendResponse(res, {
    statusCode: 201,
    message: 'Leave request submitted successfully',
    data: createdLeave,
  });
});

const getMyLeaves = asyncHandler(async (req, res) => {
  if (!req.user.employee?._id) {
    throw new ApiError(400, 'Your account is not linked to an employee profile.');
  }

  const year = parseInt(req.query.year, 10) || new Date().getUTCFullYear();
  const { page, limit, skip } = parsePagination(req.query, '-createdAt');
  const filter = { employee: req.user.employee._id };
  if (req.query.status) filter.status = req.query.status;

  const [leaves, total, balance] = await Promise.all([
    Leave.find(filter)
      .populate('approvedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Leave.countDocuments(filter),
    ensureLeaveBalance(req.user.employee._id, year),
  ]);

  return sendResponse(res, {
    statusCode: 200,
    message: 'Personal leaves retrieved',
    data: {
      balance,
      leaves,
    },
    meta: buildMeta(total, page, limit),
  });
});

const getLeaves = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, '-createdAt');
  const filter = {};

  if (req.user.role === ROLES.EMPLOYEE) {
    if (!req.user.employee?._id) {
      return sendResponse(res, { statusCode: 200, data: [], meta: buildMeta(0, page, limit) });
    }
    filter.employee = req.user.employee._id;
  } else if (req.user.role === ROLES.DEPARTMENT_MANAGER) {
    const teamEmps = await Employee.find({ department: { $in: req.managedDepartmentIds } }).select('_id');
    const teamIds = teamEmps.map((e) => e._id);
    if (req.user.employee?._id) teamIds.push(req.user.employee._id);
    filter.employee = { $in: teamIds };
  }

  if (req.query.status) filter.status = req.query.status;
  if (req.query.leaveType) filter.leaveType = req.query.leaveType;
  if (req.query.employee && [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER].includes(req.user.role)) {
    filter.employee = req.query.employee;
  }

  if (req.query.department && [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER].includes(req.user.role)) {
    const deptEmps = await Employee.find({ department: req.query.department }).select('_id');
    filter.employee = { $in: deptEmps.map((e) => e._id) };
  }

  if (req.query.month && req.query.year) {
    const y = parseInt(req.query.year, 10);
    const m = parseInt(req.query.month, 10);
    const monthStart = new Date(Date.UTC(y, m - 1, 1));
    const monthEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    filter.startDate = { $lte: monthEnd };
    filter.endDate = { $gte: monthStart };
  }

  const [leaves, total] = await Promise.all([
    Leave.find(filter)
      .populate({
        path: 'employee',
        select: 'employeeId firstName lastName designation department profilePhoto',
        populate: { path: 'department', select: 'name code' },
      })
      .populate('approvedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Leave.countDocuments(filter),
  ]);

  return sendResponse(res, {
    statusCode: 200,
    message: 'Leave requests retrieved',
    data: leaves,
    meta: buildMeta(total, page, limit),
  });
});

async function assertCanApproveLeave(req, leave) {
  if (![ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER].includes(req.user.role)) {
    throw new ApiError(403, 'You are not authorized to approve or reject leave requests.');
  }

  // Employees cannot approve their own leave (even if they hold a manager/HR role)
  if (req.user.employee && String(req.user.employee._id) === String(leave.employee)) {
    throw new ApiError(403, 'You cannot approve or reject your own leave request.');
  }

  if (req.user.role === ROLES.DEPARTMENT_MANAGER) {
    const emp = await Employee.findById(leave.employee).select('department');
    const allowedDepts = req.managedDepartmentIds.map(String);
    if (!emp || !allowedDepts.includes(String(emp.department))) {
      throw new ApiError(403, 'Department managers can only decide on leave requests from their own department.');
    }
  }
}

const approveLeave = asyncHandler(async (req, res) => {
  const leave = await Leave.findById(req.params.id);
  if (!leave) throw new ApiError(404, 'Leave request not found.');
  if (leave.status !== 'Pending') {
    throw new ApiError(400, `Leave request is already ${leave.status}.`);
  }

  await assertCanApproveLeave(req, leave);

  const year = new Date(leave.startDate).getUTCFullYear();
  const bucketKey = LEAVE_TYPE_KEY_MAP[leave.leaveType];
  const comment = req.body.comment || '';

  const updatedLeave = await runWithTransaction(async (session) => {
    const balance = await ensureLeaveBalance(leave.employee, year, session);
    const bucket = balance.balances[bucketKey];
    bucket.pending = Math.max(0, bucket.pending - leave.totalDays);
    bucket.used += leave.totalDays;
    await balance.save(session ? { session } : {});

    leave.status = 'Approved';
    leave.approvedBy = req.user._id;
    leave.approvalNotes = comment;
    leave.approvalHistory.push({
      action: 'APPROVED',
      by: req.user._id,
      role: req.user.role,
      comment,
      at: new Date(),
    });
    return leave.save(session ? { session } : {});
  });

  const empUser = await User.findOne({ employee: leave.employee }).select('_id');
  if (empUser) {
    await notifyUsers([empUser._id], {
      type: 'LEAVE_APPROVED',
      title: 'Leave Request Approved',
      message: `Your ${leave.leaveType} request (${leave.totalDays} day(s)) has been approved.`,
      link: '/leaves',
    });
  }

  await recordAudit({
    req,
    action: 'LEAVE_APPROVED',
    entityType: 'Leave',
    entityId: leave._id,
    metadata: { employee: String(leave.employee), leaveType: leave.leaveType, totalDays: leave.totalDays },
  });

  return sendResponse(res, {
    statusCode: 200,
    message: 'Leave request approved',
    data: updatedLeave,
  });
});

const rejectLeave = asyncHandler(async (req, res) => {
  const leave = await Leave.findById(req.params.id);
  if (!leave) throw new ApiError(404, 'Leave request not found.');
  if (leave.status !== 'Pending') {
    throw new ApiError(400, `Leave request is already ${leave.status}.`);
  }

  await assertCanApproveLeave(req, leave);

  const year = new Date(leave.startDate).getUTCFullYear();
  const bucketKey = LEAVE_TYPE_KEY_MAP[leave.leaveType];
  const comment = req.body.comment || '';

  const updatedLeave = await runWithTransaction(async (session) => {
    const balance = await ensureLeaveBalance(leave.employee, year, session);
    const bucket = balance.balances[bucketKey];
    bucket.pending = Math.max(0, bucket.pending - leave.totalDays);
    await balance.save(session ? { session } : {});

    leave.status = 'Rejected';
    leave.approvedBy = req.user._id;
    leave.approvalNotes = comment;
    leave.approvalHistory.push({
      action: 'REJECTED',
      by: req.user._id,
      role: req.user.role,
      comment,
      at: new Date(),
    });
    return leave.save(session ? { session } : {});
  });

  const empUser = await User.findOne({ employee: leave.employee }).select('_id');
  if (empUser) {
    await notifyUsers([empUser._id], {
      type: 'LEAVE_REJECTED',
      title: 'Leave Request Rejected',
      message: `Your ${leave.leaveType} request (${leave.totalDays} day(s)) was rejected.${comment ? ` Reason: ${comment}` : ''}`,
      link: '/leaves',
    });
  }

  await recordAudit({
    req,
    action: 'LEAVE_REJECTED',
    entityType: 'Leave',
    entityId: leave._id,
    metadata: { employee: String(leave.employee), leaveType: leave.leaveType, comment },
  });

  return sendResponse(res, {
    statusCode: 200,
    message: 'Leave request rejected',
    data: updatedLeave,
  });
});

const cancelLeave = asyncHandler(async (req, res) => {
  const leave = await Leave.findById(req.params.id);
  if (!leave) throw new ApiError(404, 'Leave request not found.');

  const isOwner = req.user.employee && String(req.user.employee._id) === String(leave.employee);
  const isAdminOrHR = [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER].includes(req.user.role);

  if (!isOwner && !isAdminOrHR) {
    throw new ApiError(403, 'You are not authorized to cancel this leave request.');
  }

  if (!['Pending', 'Approved'].includes(leave.status)) {
    throw new ApiError(400, `Cannot cancel a leave request that is ${leave.status}.`);
  }

  const prevStatus = leave.status;
  const year = new Date(leave.startDate).getUTCFullYear();
  const bucketKey = LEAVE_TYPE_KEY_MAP[leave.leaveType];

  const updated = await runWithTransaction(async (session) => {
    const balance = await ensureLeaveBalance(leave.employee, year, session);
    const bucket = balance.balances[bucketKey];
    if (prevStatus === 'Pending') {
      bucket.pending = Math.max(0, bucket.pending - leave.totalDays);
    } else if (prevStatus === 'Approved') {
      bucket.used = Math.max(0, bucket.used - leave.totalDays);
    }
    await balance.save(session ? { session } : {});

    leave.status = 'Cancelled';
    leave.approvalHistory.push({
      action: 'CANCELLED',
      by: req.user._id,
      role: req.user.role,
      comment: req.body?.comment || 'Cancelled by user',
      at: new Date(),
    });
    return leave.save(session ? { session } : {});
  });

  await recordAudit({
    req,
    action: 'LEAVE_CANCELLED',
    entityType: 'Leave',
    entityId: leave._id,
    metadata: { previousStatus: prevStatus },
  });

  return sendResponse(res, {
    statusCode: 200,
    message: 'Leave request cancelled',
    data: updated,
  });
});

const downloadLeaveDocument = asyncHandler(async (req, res) => {
  const leave = await Leave.findById(req.params.id);
  if (!leave || !leave.supportingDocument?.filePath) {
    throw new ApiError(404, 'Supporting document not found.');
  }

  const isOwner = req.user.employee && String(req.user.employee._id) === String(leave.employee);
  const isPrivileged = [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER].includes(req.user.role);
  let isDeptMgr = false;
  if (req.user.role === ROLES.DEPARTMENT_MANAGER) {
    const emp = await Employee.findById(leave.employee).select('department');
    isDeptMgr = emp && req.managedDepartmentIds.map(String).includes(String(emp.department));
  }

  if (!isOwner && !isPrivileged && !isDeptMgr) {
    throw new ApiError(403, 'Not authorized to download this document.');
  }

  const absPath = path.resolve(UPLOAD_ROOT, leave.supportingDocument.filePath);
  if (!absPath.startsWith(path.resolve(UPLOAD_ROOT)) || !fs.existsSync(absPath)) {
    throw new ApiError(404, 'Document file not found on disk.');
  }

  return res.download(absPath, leave.supportingDocument.fileName || 'leave-document');
});

module.exports = {
  applyLeave,
  getMyLeaves,
  getLeaves,
  approveLeave,
  rejectLeave,
  cancelLeave,
  downloadLeaveDocument,
};
