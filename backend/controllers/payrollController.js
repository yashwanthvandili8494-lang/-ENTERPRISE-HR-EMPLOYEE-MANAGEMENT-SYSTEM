const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { ROLES } = require('../utils/constants');
const { generatePayslipPdfBuffer } = require('../utils/pdf');
const { getCompanySettings } = require('../services/settingsService');
const { notifyUsers } = require('../services/notificationService');
const { recordAudit } = require('../services/auditService');

const getPayrolls = asyncHandler(async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query, '-year -month');
  const filter = {};

  if (req.query.employee) filter.employee = req.query.employee;
  if (req.query.month) filter.month = parseInt(req.query.month, 10);
  if (req.query.year) filter.year = parseInt(req.query.year, 10);
  if (req.query.salaryMonth) filter.salaryMonth = req.query.salaryMonth;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;

  if (req.query.department) {
    const deptEmps = await Employee.find({ department: req.query.department }).select('_id');
    filter.employee = { $in: deptEmps.map((e) => e._id) };
  }

  const [records, total, totalsAgg] = await Promise.all([
    Payroll.find(filter)
      .populate({
        path: 'employee',
        select: 'employeeId firstName lastName email designation department salary.currency',
        populate: { path: 'department', select: 'name code' },
      })
      .populate('generatedBy', 'name email')
      .sort({ year: -1, month: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payroll.countDocuments(filter),
    Payroll.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalNetSalary: { $sum: '$netSalary' },
          totalBasic: { $sum: '$basicSalary' },
          totalBonus: { $sum: '$bonus' },
          totalDeductions: { $sum: '$deductions' },
        },
      },
    ]),
  ]);

  return sendResponse(res, {
    statusCode: 200,
    message: 'Payroll records retrieved',
    data: {
      records,
      summary: totalsAgg[0] || {
        totalNetSalary: 0,
        totalBasic: 0,
        totalBonus: 0,
        totalDeductions: 0,
      },
    },
    meta: buildMeta(total, page, limit),
  });
});

const getMyPayrolls = asyncHandler(async (req, res) => {
  if (!req.user.employee?._id) {
    throw new ApiError(400, 'Your account is not linked to an employee profile.');
  }

  const { page, limit, skip } = parsePagination(req.query, '-year -month');
  const filter = { employee: req.user.employee._id };
  if (req.query.year) filter.year = parseInt(req.query.year, 10);

  const [records, total] = await Promise.all([
    Payroll.find(filter)
      .populate({
        path: 'employee',
        select: 'employeeId firstName lastName designation department salary.currency',
        populate: { path: 'department', select: 'name code' },
      })
      .sort({ year: -1, month: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Payroll.countDocuments(filter),
  ]);

  return sendResponse(res, {
    statusCode: 200,
    message: 'Personal payslips retrieved',
    data: records,
    meta: buildMeta(total, page, limit),
  });
});

const getPayrollById = asyncHandler(async (req, res) => {
  const payroll = await Payroll.findById(req.params.id)
    .populate({
      path: 'employee',
      select: 'employeeId firstName lastName email designation department salary.currency',
      populate: { path: 'department', select: 'name code' },
    })
    .populate('generatedBy', 'name email');

  if (!payroll) throw new ApiError(404, 'Payroll record not found.');

  const isPrivileged = [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER].includes(req.user.role);
  const isOwner = req.user.employee && String(req.user.employee._id) === String(payroll.employee._id);

  if (!isPrivileged && !isOwner) {
    throw new ApiError(403, 'You are not authorized to view this payslip.');
  }

  return sendResponse(res, {
    statusCode: 200,
    message: 'Payroll record retrieved',
    data: payroll,
  });
});

const createPayroll = asyncHandler(async (req, res) => {
  const data = req.body;
  const employee = await Employee.findById(data.employee);
  if (!employee) throw new ApiError(404, 'Employee not found.');

  const existing = await Payroll.findOne({
    employee: data.employee,
    month: data.month,
    year: data.year,
  });
  if (existing) {
    throw new ApiError(409, `Payroll record already exists for ${employee.employeeId} for ${data.year}-${String(data.month).padStart(2, '0')}.`);
  }

  const payroll = await Payroll.create({
    employee: data.employee,
    month: data.month,
    year: data.year,
    basicSalary: data.basicSalary,
    houseRentAllowance: data.houseRentAllowance || 0,
    otherAllowances: data.otherAllowances || 0,
    bonus: data.bonus || 0,
    deductions: data.deductions || 0,
    paymentStatus: data.paymentStatus || 'Pending',
    paymentDate: data.paymentDate ? new Date(data.paymentDate) : data.paymentStatus === 'Paid' ? new Date() : null,
    notes: data.notes || '',
    generatedBy: req.user._id,
  });

  const empUser = await User.findOne({ employee: employee._id }).select('_id');
  if (empUser && ['Processed', 'Paid'].includes(payroll.paymentStatus)) {
    await notifyUsers([empUser._id], {
      type: 'PAYROLL_PUBLISHED',
      title: `Payslip Published (${payroll.salaryMonth})`,
      message: `Your payslip for ${payroll.salaryMonth} is now available (${payroll.paymentStatus}).`,
      link: '/payroll',
    });
  }

  await recordAudit({
    req,
    action: 'PAYROLL_CREATED',
    entityType: 'Payroll',
    entityId: payroll._id,
    metadata: { employeeId: employee.employeeId, salaryMonth: payroll.salaryMonth, netSalary: payroll.netSalary },
  });

  const populated = await Payroll.findById(payroll._id).populate({
    path: 'employee',
    select: 'employeeId firstName lastName designation department salary.currency',
    populate: { path: 'department', select: 'name code' },
  });

  return sendResponse(res, {
    statusCode: 201,
    message: 'Payroll record created successfully',
    data: populated,
  });
});

const updatePayroll = asyncHandler(async (req, res) => {
  const payroll = await Payroll.findById(req.params.id);
  if (!payroll) throw new ApiError(404, 'Payroll record not found.');

  const prevStatus = payroll.paymentStatus;
  const fields = [
    'basicSalary',
    'houseRentAllowance',
    'otherAllowances',
    'bonus',
    'deductions',
    'paymentStatus',
    'paymentDate',
    'notes',
  ];

  fields.forEach((f) => {
    if (req.body[f] !== undefined) {
      payroll[f] = f === 'paymentDate' ? (req.body[f] ? new Date(req.body[f]) : null) : req.body[f];
    }
  });

  if (payroll.paymentStatus === 'Paid' && !payroll.paymentDate) {
    payroll.paymentDate = new Date();
  }

  await payroll.save();

  if (prevStatus !== payroll.paymentStatus && ['Processed', 'Paid'].includes(payroll.paymentStatus)) {
    const empUser = await User.findOne({ employee: payroll.employee }).select('_id');
    if (empUser) {
      await notifyUsers([empUser._id], {
        type: 'PAYROLL_PUBLISHED',
        title: `Payslip ${payroll.paymentStatus} (${payroll.salaryMonth})`,
        message: `Your salary statement for ${payroll.salaryMonth} has been marked as ${payroll.paymentStatus}.`,
        link: '/payroll',
      });
    }
  }

  await recordAudit({
    req,
    action: 'PAYROLL_UPDATED',
    entityType: 'Payroll',
    entityId: payroll._id,
    metadata: { salaryMonth: payroll.salaryMonth, netSalary: payroll.netSalary, paymentStatus: payroll.paymentStatus },
  });

  const populated = await Payroll.findById(payroll._id).populate({
    path: 'employee',
    select: 'employeeId firstName lastName designation department salary.currency',
    populate: { path: 'department', select: 'name code' },
  });

  return sendResponse(res, {
    statusCode: 200,
    message: 'Payroll record updated successfully',
    data: populated,
  });
});

const downloadPayslipPdf = asyncHandler(async (req, res) => {
  const payroll = await Payroll.findById(req.params.id).populate({
    path: 'employee',
    populate: { path: 'department', select: 'name code' },
  });
  if (!payroll) throw new ApiError(404, 'Payroll record not found.');

  const isPrivileged = [ROLES.SUPER_ADMIN, ROLES.HR_MANAGER].includes(req.user.role);
  const isOwner = req.user.employee && String(req.user.employee._id) === String(payroll.employee._id);

  if (!isPrivileged && !isOwner) {
    throw new ApiError(403, 'You are not authorized to download this payslip.');
  }

  const company = await getCompanySettings();
  const pdfBuffer = await generatePayslipPdfBuffer({
    payroll,
    employee: payroll.employee,
    company,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="payslip-${payroll.employee.employeeId}-${payroll.salaryMonth}.pdf"`
  );
  return res.status(200).send(pdfBuffer);
});

module.exports = {
  getPayrolls,
  getMyPayrolls,
  getPayrollById,
  createPayroll,
  updatePayroll,
  downloadPayslipPdf,
};
