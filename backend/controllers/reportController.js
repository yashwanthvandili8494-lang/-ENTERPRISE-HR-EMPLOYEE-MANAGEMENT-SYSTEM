const Employee = require('../models/Employee');
const Department = require('../models/Department');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Payroll = require('../models/Payroll');
const Candidate = require('../models/Candidate');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const { ROLES } = require('../utils/constants');
const { toCsv } = require('../utils/csv');
const { generateReportPdfBuffer } = require('../utils/pdf');
const { getCompanySettings } = require('../services/settingsService');

async function formatReportOutput(req, res, { title, fileName, columns, rows, summary = {} }) {
  const format = (req.query.format || 'json').toLowerCase();

  if (format === 'csv') {
    const csv = toCsv(columns, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.csv"`);
    return res.status(200).send(csv);
  }

  if (format === 'pdf') {
    const company = await getCompanySettings();
    const subtitle = req.query.startDate || req.query.endDate
      ? `Date Filter: ${req.query.startDate || 'Start'} to ${req.query.endDate || 'Present'} | Total Rows: ${rows.length}`
      : `Total Rows: ${rows.length}`;
    const pdfBuffer = await generateReportPdfBuffer({
      title,
      subtitle,
      columns,
      rows,
      company,
    });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}.pdf"`);
    return res.status(200).send(pdfBuffer);
  }

  return sendResponse(res, {
    statusCode: 200,
    message: `${title} retrieved`,
    data: {
      title,
      summary,
      records: rows,
    },
  });
}

async function resolveScopedEmployeeIds(req) {
  const empFilter = {};
  if (req.user.role === ROLES.DEPARTMENT_MANAGER) {
    empFilter.department = { $in: req.managedDepartmentIds };
  }
  if (req.query.department) {
    if (req.user.role === ROLES.DEPARTMENT_MANAGER) {
      if (!req.managedDepartmentIds.map(String).includes(String(req.query.department))) {
        return [];
      }
    }
    empFilter.department = req.query.department;
  }
  if (req.query.employee) {
    empFilter._id = req.query.employee;
  }
  if (Object.keys(empFilter).length === 0) return null;
  const emps = await Employee.find(empFilter).select('_id').lean();
  return emps.map((e) => e._id);
}

const getEmployeeReport = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === ROLES.DEPARTMENT_MANAGER) {
    filter.department = { $in: req.managedDepartmentIds };
  }
  if (req.query.department) filter.department = req.query.department;
  if (req.query.employee) filter._id = req.query.employee;
  if (req.query.status) filter.employmentStatus = req.query.status;
  if (req.query.startDate || req.query.endDate) {
    filter.joiningDate = {};
    if (req.query.startDate) filter.joiningDate.$gte = new Date(req.query.startDate);
    if (req.query.endDate) filter.joiningDate.$lte = new Date(`${req.query.endDate}T23:59:59.999Z`);
  }

  const rows = await Employee.find(filter)
    .populate('department', 'name code')
    .sort('employeeId')
    .lean();

  const columns = [
    { label: 'Employee ID', key: 'employeeId' },
    { label: 'Full Name', value: (r) => `${r.firstName} ${r.lastName}` },
    { label: 'Email', key: 'email' },
    { label: 'Department', value: (r) => r.department?.name || '-' },
    { label: 'Designation', key: 'designation' },
    { label: 'Type', key: 'employmentType' },
    { label: 'Status', key: 'employmentStatus' },
    { label: 'Joining Date', value: (r) => (r.joiningDate ? new Date(r.joiningDate).toISOString().slice(0, 10) : '-') },
  ];

  return formatReportOutput(req, res, {
    title: 'Employee Directory Report',
    fileName: 'employee-report',
    columns,
    rows,
    summary: {
      total: rows.length,
      active: rows.filter((r) => r.employmentStatus === 'Active').length,
      inactive: rows.filter((r) => r.employmentStatus !== 'Active').length,
    },
  });
});

const getDepartmentReport = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === ROLES.DEPARTMENT_MANAGER) {
    filter._id = { $in: req.managedDepartmentIds };
  }
  const [departments, empCounts] = await Promise.all([
    Department.find(filter)
      .populate('manager', 'firstName lastName employeeId')
      .sort('name')
      .lean(),
    Employee.aggregate([
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$employmentStatus', 'Active'] }, 1, 0] } },
        },
      },
    ]),
  ]);

  const countMap = new Map(empCounts.map((c) => [String(c._id), c]));
  const rows = departments.map((d) => {
    const c = countMap.get(String(d._id)) || { total: 0, active: 0 };
    return {
      ...d,
      managerName: d.manager ? `${d.manager.firstName} ${d.manager.lastName}` : 'Unassigned',
      totalEmployees: c.total,
      activeEmployees: c.active,
    };
  });

  const columns = [
    { label: 'Code', key: 'code' },
    { label: 'Department Name', key: 'name' },
    { label: 'Manager', key: 'managerName' },
    { label: 'Total Employees', key: 'totalEmployees' },
    { label: 'Active Employees', key: 'activeEmployees' },
    { label: 'Status', value: (r) => (r.isActive ? 'Active' : 'Inactive') },
  ];

  return formatReportOutput(req, res, {
    title: 'Department Summary Report',
    fileName: 'department-report',
    columns,
    rows,
    summary: { totalDepartments: rows.length },
  });
});

const getAttendanceReport = asyncHandler(async (req, res) => {
  const empIds = await resolveScopedEmployeeIds(req);
  const filter = {};
  if (empIds !== null) filter.employee = { $in: empIds };
  if (req.query.startDate || req.query.endDate) {
    filter.dateKey = {};
    if (req.query.startDate) filter.dateKey.$gte = req.query.startDate;
    if (req.query.endDate) filter.dateKey.$lte = req.query.endDate;
  }
  if (req.query.status) filter.status = req.query.status;

  const rows = await Attendance.find(filter)
    .populate({
      path: 'employee',
      select: 'employeeId firstName lastName department',
      populate: { path: 'department', select: 'name' },
    })
    .sort({ dateKey: -1 })
    .limit(2000)
    .lean();

  const columns = [
    { label: 'Date', key: 'dateKey' },
    { label: 'Employee ID', value: (r) => r.employee?.employeeId || '-' },
    { label: 'Employee', value: (r) => (r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '-') },
    { label: 'Department', value: (r) => r.employee?.department?.name || '-' },
    { label: 'Check In (UTC)', value: (r) => (r.checkIn ? new Date(r.checkIn).toISOString().slice(11, 19) : '-') },
    { label: 'Check Out (UTC)', value: (r) => (r.checkOut ? new Date(r.checkOut).toISOString().slice(11, 19) : '-') },
    { label: 'Working Hrs', key: 'workingHours' },
    { label: 'Overtime Hrs', key: 'overtimeHours' },
    { label: 'Status', key: 'status' },
  ];

  return formatReportOutput(req, res, {
    title: 'Attendance Report',
    fileName: 'attendance-report',
    columns,
    rows,
    summary: {
      totalRecords: rows.length,
      present: rows.filter((r) => r.status === 'Present').length,
      late: rows.filter((r) => r.status === 'Late').length,
      halfDay: rows.filter((r) => r.status === 'Half-Day').length,
      absent: rows.filter((r) => r.status === 'Absent').length,
    },
  });
});

const getLeaveReport = asyncHandler(async (req, res) => {
  const empIds = await resolveScopedEmployeeIds(req);
  const filter = {};
  if (empIds !== null) filter.employee = { $in: empIds };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.startDate || req.query.endDate) {
    filter.startDate = {};
    if (req.query.startDate) filter.startDate.$gte = new Date(req.query.startDate);
    if (req.query.endDate) filter.startDate.$lte = new Date(`${req.query.endDate}T23:59:59.999Z`);
  }

  const rows = await Leave.find(filter)
    .populate({
      path: 'employee',
      select: 'employeeId firstName lastName department',
      populate: { path: 'department', select: 'name' },
    })
    .populate('approvedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(2000)
    .lean();

  const columns = [
    { label: 'Employee ID', value: (r) => r.employee?.employeeId || '-' },
    { label: 'Employee', value: (r) => (r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '-') },
    { label: 'Department', value: (r) => r.employee?.department?.name || '-' },
    { label: 'Leave Type', key: 'leaveType' },
    { label: 'Start Date', value: (r) => new Date(r.startDate).toISOString().slice(0, 10) },
    { label: 'End Date', value: (r) => new Date(r.endDate).toISOString().slice(0, 10) },
    { label: 'Days', key: 'totalDays' },
    { label: 'Status', key: 'status' },
    { label: 'Decided By', value: (r) => r.approvedBy?.name || '-' },
  ];

  return formatReportOutput(req, res, {
    title: 'Leave Management Report',
    fileName: 'leave-report',
    columns,
    rows,
    summary: {
      totalRequests: rows.length,
      approved: rows.filter((r) => r.status === 'Approved').length,
      pending: rows.filter((r) => r.status === 'Pending').length,
      rejected: rows.filter((r) => r.status === 'Rejected').length,
    },
  });
});

const getPayrollReport = asyncHandler(async (req, res) => {
  if (![ROLES.SUPER_ADMIN, ROLES.HR_MANAGER].includes(req.user.role)) {
    throw new ApiError(403, 'Only HR Managers and Super Admins can access payroll reports.');
  }

  const empIds = await resolveScopedEmployeeIds(req);
  const filter = {};
  if (empIds !== null) filter.employee = { $in: empIds };
  if (req.query.month) filter.month = parseInt(req.query.month, 10);
  if (req.query.year) filter.year = parseInt(req.query.year, 10);
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;

  const rows = await Payroll.find(filter)
    .populate({
      path: 'employee',
      select: 'employeeId firstName lastName department designation',
      populate: { path: 'department', select: 'name' },
    })
    .sort({ year: -1, month: -1 })
    .limit(2000)
    .lean();

  const columns = [
    { label: 'Salary Month', key: 'salaryMonth' },
    { label: 'Employee ID', value: (r) => r.employee?.employeeId || '-' },
    { label: 'Employee', value: (r) => (r.employee ? `${r.employee.firstName} ${r.employee.lastName}` : '-') },
    { label: 'Department', value: (r) => r.employee?.department?.name || '-' },
    { label: 'Basic', key: 'basicSalary' },
    { label: 'HRA', key: 'houseRentAllowance' },
    { label: 'Allowances', key: 'otherAllowances' },
    { label: 'Bonus', key: 'bonus' },
    { label: 'Deductions', key: 'deductions' },
    { label: 'Net Salary', key: 'netSalary' },
    { label: 'Status', key: 'paymentStatus' },
  ];

  const totalDisbursed = Math.round(rows.reduce((sum, r) => sum + (r.netSalary || 0), 0) * 100) / 100;

  return formatReportOutput(req, res, {
    title: 'Payroll Summary Report',
    fileName: 'payroll-report',
    columns,
    rows,
    summary: {
      totalRecords: rows.length,
      totalNetPayroll: totalDisbursed,
      paidCount: rows.filter((r) => r.paymentStatus === 'Paid').length,
    },
  });
});

const getRecruitmentReport = asyncHandler(async (req, res) => {
  if (![ROLES.SUPER_ADMIN, ROLES.HR_MANAGER].includes(req.user.role)) {
    throw new ApiError(403, 'Only HR Managers and Super Admins can access recruitment reports.');
  }

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.startDate || req.query.endDate) {
    filter.createdAt = {};
    if (req.query.startDate) filter.createdAt.$gte = new Date(req.query.startDate);
    if (req.query.endDate) filter.createdAt.$lte = new Date(`${req.query.endDate}T23:59:59.999Z`);
  }

  const rows = await Candidate.find(filter)
    .populate({
      path: 'job',
      select: 'title code department',
      populate: { path: 'department', select: 'name' },
    })
    .sort({ createdAt: -1 })
    .lean();

  const columns = [
    { label: 'Candidate', value: (r) => `${r.firstName} ${r.lastName}` },
    { label: 'Email', key: 'email' },
    { label: 'Job Opening', value: (r) => r.job?.title || '-' },
    { label: 'Department', value: (r) => r.job?.department?.name || '-' },
    { label: 'Exp (Yrs)', key: 'experienceYears' },
    { label: 'Status', key: 'status' },
    { label: 'Applied Date', value: (r) => new Date(r.createdAt).toISOString().slice(0, 10) },
  ];

  return formatReportOutput(req, res, {
    title: 'Recruitment Pipeline Report',
    fileName: 'recruitment-report',
    columns,
    rows,
    summary: {
      totalCandidates: rows.length,
      hired: rows.filter((r) => r.status === 'Hired').length,
      inInterview: rows.filter((r) => r.status === 'Interview Scheduled').length,
    },
  });
});

module.exports = {
  getEmployeeReport,
  getDepartmentReport,
  getAttendanceReport,
  getLeaveReport,
  getPayrollReport,
  getRecruitmentReport,
};
