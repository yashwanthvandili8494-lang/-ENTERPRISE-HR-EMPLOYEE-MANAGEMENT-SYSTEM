const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { ROLES } = require('../utils/constants');
const { getCompanySettings } = require('../services/settingsService');
const {
  getDateKeyInTimezone,
  getTimePartsInTimezone,
  parseTimeStringToMinutes,
} = require('../utils/timezone');
const { recordAudit } = require('../services/auditService');

const checkIn = asyncHandler(async (req, res) => {
  if (!req.user.employee?._id) {
    throw new ApiError(400, 'Your account is not linked to an employee profile.');
  }

  const settings = await getCompanySettings();
  const tz = settings.timezone || 'UTC';
  const now = new Date();
  const dateKey = getDateKeyInTimezone(now, tz);

  const existing = await Attendance.findOne({ employee: req.user.employee._id, dateKey });
  if (existing && existing.checkIn) {
    throw new ApiError(409, `You have already checked in for ${dateKey}.`);
  }

  const { hours, minutes } = getTimePartsInTimezone(now, tz);
  const currentMins = hours * 60 + minutes;
  const startMins = parseTimeStringToMinutes(settings.workingHours?.startTime || '09:00');
  const lateThreshold = settings.workingHours?.lateThresholdMinutes ?? 15;
  const isLate = currentMins > startMins + lateThreshold;

  let record;
  if (existing) {
    existing.checkIn = now;
    existing.isLate = isLate;
    existing.status = isLate ? 'Late' : 'Present';
    if (req.body.notes) existing.notes = req.body.notes;
    record = await existing.save();
  } else {
    record = await Attendance.create({
      employee: req.user.employee._id,
      dateKey,
      date: new Date(`${dateKey}T00:00:00.000Z`),
      checkIn: now,
      status: isLate ? 'Late' : 'Present',
      isLate,
      notes: req.body.notes || '',
    });
  }

  return sendResponse(res, {
    statusCode: 201,
    message: isLate ? 'Checked in (marked Late Arrival)' : 'Checked in successfully',
    data: { ...record.toObject(), companyTimezone: tz },
  });
});

const checkOut = asyncHandler(async (req, res) => {
  if (!req.user.employee?._id) {
    throw new ApiError(400, 'Your account is not linked to an employee profile.');
  }

  const settings = await getCompanySettings();
  const tz = settings.timezone || 'UTC';
  const now = new Date();
  const dateKey = getDateKeyInTimezone(now, tz);

  const record = await Attendance.findOne({ employee: req.user.employee._id, dateKey });
  if (!record || !record.checkIn) {
    throw new ApiError(400, 'Cannot check out without checking in first today.');
  }
  if (record.checkOut) {
    throw new ApiError(409, 'You have already checked out for today.');
  }

  const diffMs = Math.max(0, now.getTime() - new Date(record.checkIn).getTime());
  const workingHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

  const standardDaily = settings.workingHours?.standardDailyHours ?? 8;
  const halfDayHours = settings.workingHours?.halfDayHours ?? 4;
  const overtimeHours = workingHours > standardDaily ? Math.round((workingHours - standardDaily) * 100) / 100 : 0;

  const { hours, minutes } = getTimePartsInTimezone(now, tz);
  const currentMins = hours * 60 + minutes;
  const endMins = parseTimeStringToMinutes(settings.workingHours?.endTime || '18:00');
  const earlyThreshold = settings.workingHours?.earlyDepartureThresholdMinutes ?? 15;
  const isEarlyDeparture = currentMins < endMins - earlyThreshold;

  record.checkOut = now;
  record.workingHours = workingHours;
  record.overtimeHours = overtimeHours;
  record.isEarlyDeparture = isEarlyDeparture;
  if (workingHours < halfDayHours) {
    record.status = 'Half-Day';
  }
  if (req.body.notes) {
    record.notes = record.notes ? `${record.notes} | ${req.body.notes}` : req.body.notes;
  }

  await record.save();

  return sendResponse(res, {
    statusCode: 200,
    message: 'Checked out successfully',
    data: { ...record.toObject(), companyTimezone: tz },
  });
});

const getMyAttendance = asyncHandler(async (req, res) => {
  if (!req.user.employee?._id) {
    throw new ApiError(400, 'Your account is not linked to an employee profile.');
  }

  const settings = await getCompanySettings();
  const tz = settings.timezone || 'UTC';
  const todayKey = getDateKeyInTimezone(new Date(), tz);

  const { page, limit, skip } = parsePagination(req.query, '-date');
  const filter = { employee: req.user.employee._id };

  if (req.query.month && req.query.year) {
    const m = String(req.query.month).padStart(2, '0');
    const prefix = `${req.query.year}-${m}`;
    filter.dateKey = { $regex: `^${prefix}` };
  } else if (req.query.startDate || req.query.endDate) {
    filter.dateKey = {};
    if (req.query.startDate) filter.dateKey.$gte = req.query.startDate;
    if (req.query.endDate) filter.dateKey.$lte = req.query.endDate;
  }

  const [records, total, todayRecord] = await Promise.all([
    Attendance.find(filter).sort({ dateKey: -1 }).skip(skip).limit(limit).lean(),
    Attendance.countDocuments(filter),
    Attendance.findOne({ employee: req.user.employee._id, dateKey: todayKey }).lean(),
  ]);

  const summary = {
    totalDays: records.length,
    present: records.filter((r) => r.status === 'Present').length,
    late: records.filter((r) => r.status === 'Late' || r.isLate).length,
    halfDay: records.filter((r) => r.status === 'Half-Day').length,
    absent: records.filter((r) => r.status === 'Absent').length,
    totalWorkingHours: Math.round(records.reduce((acc, r) => acc + (r.workingHours || 0), 0) * 100) / 100,
    totalOvertimeHours: Math.round(records.reduce((acc, r) => acc + (r.overtimeHours || 0), 0) * 100) / 100,
  };

  return sendResponse(res, {
    statusCode: 200,
    message: 'Personal attendance retrieved',
    data: {
      today: todayRecord,
      todayKey,
      companyTimezone: tz,
      summary,
      records,
    },
    meta: buildMeta(total, page, limit),
  });
});

const getAttendance = asyncHandler(async (req, res) => {
  const settings = await getCompanySettings();
  const tz = settings.timezone || 'UTC';
  const { page, limit, skip } = parsePagination(req.query, '-dateKey');
  const filter = {};

  if (req.user.role === ROLES.EMPLOYEE) {
    if (!req.user.employee?._id) {
      return sendResponse(res, { statusCode: 200, data: { records: [], companyTimezone: tz }, meta: buildMeta(0, page, limit) });
    }
    filter.employee = req.user.employee._id;
  } else if (req.user.role === ROLES.DEPARTMENT_MANAGER) {
    const teamEmployees = await Employee.find({ department: { $in: req.managedDepartmentIds } }).select('_id');
    const teamIds = teamEmployees.map((e) => e._id);
    if (req.user.employee?._id) teamIds.push(req.user.employee._id);
    filter.employee = { $in: teamIds };
  }

  if (req.query.employee) {
    if (req.user.role === ROLES.EMPLOYEE && String(req.query.employee) !== String(req.user.employee?._id)) {
      throw new ApiError(403, 'Employees can only view their own attendance.');
    }
    if (req.user.role === ROLES.DEPARTMENT_MANAGER) {
      const allowed = filter.employee.$in.map(String);
      if (!allowed.includes(String(req.query.employee))) {
        throw new ApiError(403, 'Not authorized to view attendance for this employee.');
      }
    }
    filter.employee = req.query.employee;
  } else if (req.query.department && [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER].includes(req.user.role)) {
    const deptEmps = await Employee.find({ department: req.query.department }).select('_id');
    filter.employee = { $in: deptEmps.map((e) => e._id) };
  }

  if (req.query.dateKey) {
    filter.dateKey = req.query.dateKey;
  } else if (req.query.month && req.query.year) {
    const m = String(req.query.month).padStart(2, '0');
    filter.dateKey = { $regex: `^${req.query.year}-${m}` };
  } else if (req.query.startDate || req.query.endDate) {
    filter.dateKey = {};
    if (req.query.startDate) filter.dateKey.$gte = req.query.startDate;
    if (req.query.endDate) filter.dateKey.$lte = req.query.endDate;
  }

  if (req.query.status) {
    filter.status = req.query.status;
  }

  const [records, total] = await Promise.all([
    Attendance.find(filter)
      .populate({
        path: 'employee',
        select: 'employeeId firstName lastName designation department profilePhoto',
        populate: { path: 'department', select: 'name code' },
      })
      .sort({ dateKey: -1, checkIn: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Attendance.countDocuments(filter),
  ]);

  return sendResponse(res, {
    statusCode: 200,
    message: 'Attendance records retrieved',
    data: {
      companyTimezone: tz,
      records,
    },
    meta: buildMeta(total, page, limit),
  });
});

const recordManualAttendance = asyncHandler(async (req, res) => {
  const { employee, dateKey, checkIn: checkInVal, checkOut: checkOutVal, status, notes } = req.body;

  const emp = await Employee.findById(employee);
  if (!emp) throw new ApiError(404, 'Employee not found.');

  const settings = await getCompanySettings();
  const standardDaily = settings.workingHours?.standardDailyHours ?? 8;

  const checkInDate = checkInVal ? new Date(checkInVal) : null;
  const checkOutDate = checkOutVal ? new Date(checkOutVal) : null;
  let workingHours = 0;
  let overtimeHours = 0;

  if (checkInDate && checkOutDate && checkOutDate > checkInDate) {
    workingHours = Math.round(((checkOutDate - checkInDate) / (1000 * 60 * 60)) * 100) / 100;
    overtimeHours = workingHours > standardDaily ? Math.round((workingHours - standardDaily) * 100) / 100 : 0;
  }

  const record = await Attendance.findOneAndUpdate(
    { employee, dateKey },
    {
      employee,
      dateKey,
      date: new Date(`${dateKey}T00:00:00.000Z`),
      checkIn: checkInDate,
      checkOut: checkOutDate,
      workingHours,
      overtimeHours,
      status,
      isLate: status === 'Late',
      notes: notes || '',
    },
    { upsert: true, new: true, runValidators: true }
  ).populate({
    path: 'employee',
    select: 'employeeId firstName lastName designation department',
    populate: { path: 'department', select: 'name code' },
  });

  await recordAudit({
    req,
    action: 'ATTENDANCE_RECORDED_MANUAL',
    entityType: 'Attendance',
    entityId: record._id,
    metadata: { employee: emp.employeeId, dateKey, status },
  });

  return sendResponse(res, {
    statusCode: 200,
    message: 'Attendance record saved',
    data: record,
  });
});

module.exports = {
  checkIn,
  checkOut,
  getMyAttendance,
  getAttendance,
  recordManualAttendance,
};
