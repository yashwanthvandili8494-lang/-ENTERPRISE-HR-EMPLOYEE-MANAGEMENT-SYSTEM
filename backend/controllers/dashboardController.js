const Employee = require('../models/Employee');
const Department = require('../models/Department');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Candidate = require('../models/Candidate');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const { ROLES } = require('../utils/constants');
const { getCompanySettings } = require('../services/settingsService');
const { getDateKeyInTimezone } = require('../utils/timezone');

const getStats = asyncHandler(async (req, res) => {
  const settings = await getCompanySettings();
  const tz = settings.timezone || 'UTC';
  const todayKey = getDateKeyInTimezone(new Date(), tz);
  const now = new Date();
  const todayStart = new Date(`${todayKey}T00:00:00.000Z`);
  const todayEnd = new Date(`${todayKey}T23:59:59.999Z`);

  // Scope employee filter for Department Managers
  const empFilter = {};
  if (req.user.role === ROLES.DEPARTMENT_MANAGER) {
    empFilter.department = { $in: req.managedDepartmentIds };
  }

  const scopedEmployees = await Employee.find(empFilter).select('_id employmentStatus dateOfBirth firstName lastName department designation joiningDate profilePhoto employeeId').populate('department', 'name code').lean();
  const scopedIds = scopedEmployees.map((e) => e._id);

  const totalEmployees = scopedEmployees.length;
  const activeEmployees = scopedEmployees.filter((e) => e.employmentStatus === 'Active').length;
  const inactiveEmployees = scopedEmployees.filter((e) => ['Inactive', 'Terminated'].includes(e.employmentStatus)).length;

  const [
    totalDepartments,
    todayAttendance,
    employeesOnLeaveToday,
    pendingLeaveRequests,
    pendingApprovals,
    recentActivities,
    recentNotifications,
  ] = await Promise.all([
    Department.countDocuments({ isActive: true }),
    Attendance.find({
      dateKey: todayKey,
      ...(req.user.role === ROLES.DEPARTMENT_MANAGER ? { employee: { $in: scopedIds } } : {}),
    }).lean(),
    Leave.countDocuments({
      status: 'Approved',
      startDate: { $lte: todayEnd },
      endDate: { $gte: todayStart },
      ...(req.user.role === ROLES.DEPARTMENT_MANAGER ? { employee: { $in: scopedIds } } : {}),
    }),
    Leave.countDocuments({
      status: 'Pending',
      ...(req.user.role === ROLES.DEPARTMENT_MANAGER ? { employee: { $in: scopedIds } } : {}),
    }),
    Leave.find({
      status: 'Pending',
      ...(req.user.role === ROLES.DEPARTMENT_MANAGER ? { employee: { $in: scopedIds } } : {}),
    })
      .populate({
        path: 'employee',
        select: 'employeeId firstName lastName designation department',
        populate: { path: 'department', select: 'name code' },
      })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER].includes(req.user.role)
      ? AuditLog.find().populate('user', 'name email role').sort({ createdAt: -1 }).limit(8).lean()
      : AuditLog.find({ user: req.user._id }).populate('user', 'name email role').sort({ createdAt: -1 }).limit(8).lean(),
    Notification.find({ recipient: req.user._id }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  const presentToday = todayAttendance.filter((a) => ['Present', 'Late', 'Half-Day'].includes(a.status)).length;
  const absentToday = Math.max(0, activeEmployees - presentToday - employeesOnLeaveToday);

  // Recent employees (latest 5 by joiningDate)
  const recentEmployees = [...scopedEmployees]
    .sort((a, b) => new Date(b.joiningDate) - new Date(a.joiningDate))
    .slice(0, 5);

  // Upcoming birthdays within next 30 days
  const upcomingBirthdays = scopedEmployees
    .filter((e) => e.dateOfBirth && e.employmentStatus === 'Active')
    .map((e) => {
      const dob = new Date(e.dateOfBirth);
      const nextBday = new Date(Date.UTC(now.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate()));
      if (nextBday < todayStart) {
        nextBday.setUTCFullYear(now.getUTCFullYear() + 1);
      }
      const daysUntil = Math.round((nextBday - todayStart) / (1000 * 60 * 60 * 24));
      return {
        _id: e._id,
        employeeId: e.employeeId,
        firstName: e.firstName,
        lastName: e.lastName,
        department: e.department?.name || '-',
        designation: e.designation,
        dateOfBirth: e.dateOfBirth,
        daysUntil,
      };
    })
    .filter((b) => b.daysUntil >= 0 && b.daysUntil <= 45)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5);

  return sendResponse(res, {
    statusCode: 200,
    message: 'Dashboard statistics retrieved',
    data: {
      todayKey,
      companyTimezone: tz,
      kpis: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees,
        totalDepartments,
        presentToday,
        absentToday,
        employeesOnLeave: employeesOnLeaveToday,
        pendingLeaveRequests,
      },
      widgets: {
        recentEmployees,
        recentActivities,
        upcomingBirthdays,
        pendingApprovals,
        recentNotifications,
      },
    },
  });
});

const getCharts = asyncHandler(async (req, res) => {
  const monthsCount = Math.min(12, Math.max(3, parseInt(req.query.months, 10) || 6));
  const now = new Date();
  const monthLabels = [];

  for (let i = monthsCount - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
    monthLabels.push({ key, label, start: d, end: new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 23, 59, 59, 999)) });
  }

  const rangeStart = req.query.startDate ? new Date(req.query.startDate) : monthLabels[0].start;
  const rangeEnd = req.query.endDate ? new Date(`${req.query.endDate}T23:59:59.999Z`) : now;

  const [allEmployees, departments, attendanceRecords, leaves, candidates] = await Promise.all([
    Employee.find().select('joiningDate department employmentStatus').lean(),
    Department.find({ isActive: true }).select('name code').lean(),
    Attendance.find({ date: { $gte: rangeStart, $lte: rangeEnd } }).select('dateKey status').lean(),
    Leave.find({ createdAt: { $gte: rangeStart, $lte: rangeEnd } }).select('leaveType status totalDays createdAt').lean(),
    Candidate.find({ createdAt: { $gte: rangeStart, $lte: rangeEnd } }).select('status createdAt').lean(),
  ]);

  // 1. Employee growth by month (cumulative headcount & new hires)
  const employeeGrowth = monthLabels.map((m) => {
    const cumulative = allEmployees.filter((e) => new Date(e.joiningDate) <= m.end).length;
    const newHires = allEmployees.filter((e) => {
      const jd = new Date(e.joiningDate);
      return jd >= m.start && jd <= m.end;
    }).length;
    return { month: m.label, totalEmployees: cumulative, newHires };
  });

  // 2. Attendance statistics (by month or last 14 days)
  const attendanceMap = new Map();
  attendanceRecords.forEach((a) => {
    const monthKey = a.dateKey.slice(0, 7);
    if (!attendanceMap.has(monthKey)) {
      attendanceMap.set(monthKey, { present: 0, late: 0, halfDay: 0, absent: 0 });
    }
    const entry = attendanceMap.get(monthKey);
    if (a.status === 'Present') entry.present += 1;
    else if (a.status === 'Late') entry.late += 1;
    else if (a.status === 'Half-Day') entry.halfDay += 1;
    else if (a.status === 'Absent') entry.absent += 1;
  });

  const attendanceStats = monthLabels.map((m) => {
    const counts = attendanceMap.get(m.key) || { present: 0, late: 0, halfDay: 0, absent: 0 };
    return { month: m.label, ...counts };
  });

  // 3. Department-wise employee distribution
  const deptDistribution = departments.map((d) => ({
    name: d.name,
    code: d.code,
    employees: allEmployees.filter((e) => String(e.department) === String(d._id) && e.employmentStatus !== 'Terminated').length,
  }));

  // 4. Leave statistics by type & status
  const leaveTypeCounts = {};
  leaves.forEach((l) => {
    if (!leaveTypeCounts[l.leaveType]) {
      leaveTypeCounts[l.leaveType] = { leaveType: l.leaveType, approved: 0, pending: 0, rejected: 0 };
    }
    if (l.status === 'Approved') leaveTypeCounts[l.leaveType].approved += 1;
    else if (l.status === 'Pending') leaveTypeCounts[l.leaveType].pending += 1;
    else if (l.status === 'Rejected') leaveTypeCounts[l.leaveType].rejected += 1;
  });
  const leaveStats = Object.values(leaveTypeCounts);

  // 5. Monthly recruitment statistics
  const recruitmentStats = monthLabels.map((m) => {
    const inMonth = candidates.filter((c) => {
      const cd = new Date(c.createdAt);
      return cd >= m.start && cd <= m.end;
    });
    return {
      month: m.label,
      applied: inMonth.length,
      interviewed: inMonth.filter((c) => ['Interview Scheduled', 'Selected', 'Hired'].includes(c.status)).length,
      hired: inMonth.filter((c) => c.status === 'Hired').length,
    };
  });

  return sendResponse(res, {
    statusCode: 200,
    message: 'Dashboard charts retrieved',
    data: {
      employeeGrowth,
      attendanceStats,
      deptDistribution,
      leaveStats,
      recruitmentStats,
    },
  });
});

module.exports = { getStats, getCharts };
