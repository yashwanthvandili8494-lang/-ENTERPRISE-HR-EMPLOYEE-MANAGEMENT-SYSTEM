const Department = require('../models/Department');
const Employee = require('../models/Employee');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendResponse } = require('../utils/ApiResponse');
const { parsePagination, buildMeta } = require('../utils/pagination');
const { recordAudit } = require('../services/auditService');

const getDepartments = asyncHandler(async (req, res) => {
  const { page, limit, skip, sort } = parsePagination(req.query, 'name');
  const filter = {};

  if (req.query.isActive === 'true') filter.isActive = true;
  else if (req.query.isActive === 'false') filter.isActive = false;

  if (req.query.search) {
    const regex = new RegExp(req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: regex }, { code: regex }, { description: regex }];
  }

  const [departments, total, counts] = await Promise.all([
    Department.find(filter)
      .populate({ path: 'manager', select: 'employeeId firstName lastName email designation profilePhoto' })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Department.countDocuments(filter),
    Employee.aggregate([
      {
        $group: {
          _id: '$department',
          totalEmployees: { $sum: 1 },
          activeEmployees: {
            $sum: { $cond: [{ $eq: ['$employmentStatus', 'Active'] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const countMap = new Map(counts.map((c) => [String(c._id), c]));
  const enriched = departments.map((dept) => {
    const stats = countMap.get(String(dept._id)) || { totalEmployees: 0, activeEmployees: 0 };
    return {
      ...dept,
      employeeCount: stats.totalEmployees,
      activeEmployeeCount: stats.activeEmployees,
    };
  });

  return sendResponse(res, {
    statusCode: 200,
    message: 'Departments retrieved',
    data: enriched,
    meta: buildMeta(total, page, limit),
  });
});

const getDepartmentById = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id)
    .populate({ path: 'manager', select: 'employeeId firstName lastName email designation phone profilePhoto' })
    .lean();

  if (!department) {
    throw new ApiError(404, 'Department not found.');
  }

  const employees = await Employee.find({ department: department._id })
    .select('employeeId firstName lastName email phone designation employmentType employmentStatus joiningDate profilePhoto')
    .sort('firstName')
    .lean();

  return sendResponse(res, {
    statusCode: 200,
    message: 'Department retrieved',
    data: {
      ...department,
      employeeCount: employees.length,
      activeEmployeeCount: employees.filter((e) => e.employmentStatus === 'Active').length,
      employees,
    },
  });
});

const createDepartment = asyncHandler(async (req, res) => {
  const { name, code, description, manager, isActive } = req.body;

  const duplicate = await Department.findOne({
    $or: [
      { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      { code: code.toUpperCase() },
    ],
  });
  if (duplicate) {
    throw new ApiError(409, 'A department with this name or code already exists.');
  }

  if (manager) {
    const mgrExists = await Employee.findById(manager);
    if (!mgrExists) throw new ApiError(404, 'Assigned manager employee not found.');
  }

  const department = await Department.create({
    name,
    code: code.toUpperCase(),
    description,
    manager: manager || null,
    isActive: isActive !== undefined ? isActive : true,
  });

  await recordAudit({
    req,
    action: 'DEPARTMENT_CREATED',
    entityType: 'Department',
    entityId: department._id,
    metadata: { name: department.name, code: department.code },
  });

  const populated = await Department.findById(department._id).populate({
    path: 'manager',
    select: 'employeeId firstName lastName email designation',
  });

  return sendResponse(res, {
    statusCode: 201,
    message: 'Department created successfully',
    data: populated,
  });
});

const updateDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) {
    throw new ApiError(404, 'Department not found.');
  }

  if (req.body.isActive === false && department.isActive === true) {
    const activeCount = await Employee.countDocuments({
      department: department._id,
      employmentStatus: { $in: ['Active', 'On Leave'] },
    });
    if (activeCount > 0) {
      throw new ApiError(
        409,
        `Cannot deactivate department while ${activeCount} active employee(s) are assigned to it.`
      );
    }
  }

  if (req.body.manager) {
    const mgrExists = await Employee.findById(req.body.manager);
    if (!mgrExists) throw new ApiError(404, 'Assigned manager employee not found.');
  }

  const fields = ['name', 'code', 'description', 'manager', 'isActive'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) {
      department[f] = f === 'code' ? String(req.body[f]).toUpperCase() : req.body[f] || (f === 'manager' ? null : req.body[f]);
    }
  });

  await department.save();

  await recordAudit({
    req,
    action: 'DEPARTMENT_UPDATED',
    entityType: 'Department',
    entityId: department._id,
    metadata: { name: department.name, isActive: department.isActive },
  });

  const populated = await Department.findById(department._id).populate({
    path: 'manager',
    select: 'employeeId firstName lastName email designation',
  });

  return sendResponse(res, {
    statusCode: 200,
    message: 'Department updated successfully',
    data: populated,
  });
});

const deleteDepartment = asyncHandler(async (req, res) => {
  const department = await Department.findById(req.params.id);
  if (!department) {
    throw new ApiError(404, 'Department not found.');
  }

  const activeCount = await Employee.countDocuments({
    department: department._id,
    employmentStatus: { $in: ['Active', 'On Leave'] },
  });

  if (activeCount > 0) {
    throw new ApiError(
      409,
      `Cannot delete/deactivate department because ${activeCount} active employee(s) are currently assigned.`
    );
  }

  department.isActive = false;
  await department.save();

  await recordAudit({
    req,
    action: 'DEPARTMENT_DEACTIVATED',
    entityType: 'Department',
    entityId: department._id,
    metadata: { name: department.name },
  });

  return sendResponse(res, {
    statusCode: 200,
    message: 'Department deactivated successfully',
    data: department,
  });
});

module.exports = {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
};
