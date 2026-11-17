const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');
const connectDB = require('../config/db');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const LeaveBalance = require('../models/LeaveBalance');
const CompanySettings = require('../models/CompanySettings');
const { ROLES } = require('../utils/constants');

const TEST_MONGO_URI = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/enterprise_hr_test_db';

let adminToken;
let hrToken;
let managerToken;
let employeeToken;

let itDept;
let hrDept;
let empAdmin;
let empHR;
let empManager;
let empWorker;

beforeAll(async () => {
  await connectDB(TEST_MONGO_URI);
  await mongoose.connection.db.dropDatabase();

  await CompanySettings.create({ singletonKey: 'PRIMARY_COMPANY_SETTINGS', timezone: 'UTC' });

  itDept = await Department.create({ name: 'Information Technology', code: 'IT', description: 'Tech' });
  hrDept = await Department.create({ name: 'Human Resources', code: 'HR', description: 'People' });

  const createStaff = async ({ employeeId, firstName, lastName, email, role, department, basic }) => {
    const emp = await Employee.create({
      employeeId,
      firstName,
      lastName,
      email,
      phone: '+1-555-0100',
      department: department._id,
      designation: role,
      joiningDate: new Date('2025-01-10'),
      salary: { basic, hra: 1000, otherAllowances: 500, deductions: 300, currency: 'INR' },
      employmentStatus: 'Active',
    });
    const user = await User.create({
      name: `${firstName} ${lastName}`,
      email,
      password: 'Password123!',
      role,
      employee: emp._id,
      isActive: true,
    });
    emp.user = user._id;
    await emp.save();
    await LeaveBalance.create({ employee: emp._id, year: new Date().getUTCFullYear() });
    return { emp, user };
  };

  ({ emp: empAdmin } = await createStaff({
    employeeId: 'TST-001',
    firstName: 'Super',
    lastName: 'Admin',
    email: 'admin@test.local',
    role: ROLES.SUPER_ADMIN,
    department: hrDept,
    basic: 10000,
  }));

  ({ emp: empHR } = await createStaff({
    employeeId: 'TST-002',
    firstName: 'HR',
    lastName: 'Manager',
    email: 'hr@test.local',
    role: ROLES.HR_MANAGER,
    department: hrDept,
    basic: 8000,
  }));

  ({ emp: empManager } = await createStaff({
    employeeId: 'TST-003',
    firstName: 'IT',
    lastName: 'Lead',
    email: 'manager@test.local',
    role: ROLES.DEPARTMENT_MANAGER,
    department: itDept,
    basic: 9000,
  }));
  await Department.findByIdAndUpdate(itDept._id, { manager: empManager._id });

  ({ emp: empWorker } = await createStaff({
    employeeId: 'TST-004',
    firstName: 'Jane',
    lastName: 'Developer',
    email: 'employee@test.local',
    role: ROLES.EMPLOYEE,
    department: itDept,
    basic: 6000,
  }));

  const loginAs = async (email) => {
    const res = await request(app).post('/api/auth/login').send({ email, password: 'Password123!' });
    expect(res.statusCode).toBe(200);
    return res.body.data.accessToken;
  };

  adminToken = await loginAs('admin@test.local');
  hrToken = await loginAs('hr@test.local');
  managerToken = await loginAs('manager@test.local');
  employeeToken = await loginAs('employee@test.local');
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

describe('Authentication & Security', () => {
  it('rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.local', password: 'WrongPassword!' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects unauthenticated access to protected routes', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('sets HTTP-only refresh cookie on login, supports /me and logout', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'employee@test.local', password: 'Password123!' });
    expect(loginRes.statusCode).toBe(200);
    expect(loginRes.headers['set-cookie']).toBeDefined();
    expect(loginRes.body.data.user.password).toBeUndefined();

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`);
    expect(meRes.statusCode).toBe(200);
    expect(meRes.body.data.email).toBe('employee@test.local');

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`);
    expect(logoutRes.statusCode).toBe(200);
  });

  it('validates login request body', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email', password: '' });
    expect(res.statusCode).toBe(400);
  });
});

describe('Role-Based Access Control (RBAC)', () => {
  it('restricts audit logs and settings update to SUPER_ADMIN', async () => {
    const hrAudit = await request(app).get('/api/audit-logs').set('Authorization', `Bearer ${hrToken}`);
    expect(hrAudit.statusCode).toBe(403);

    const adminAudit = await request(app).get('/api/audit-logs').set('Authorization', `Bearer ${adminToken}`);
    expect(adminAudit.statusCode).toBe(200);

    const hrSettingsPut = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ companyName: 'Unauthorized' });
    expect(hrSettingsPut.statusCode).toBe(403);

    const adminSettingsPut = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ companyName: 'Verified Enterprise Corp' });
    expect(adminSettingsPut.statusCode).toBe(200);
    expect(adminSettingsPut.body.data.companyName).toBe('Verified Enterprise Corp');
  });

  it('prevents Department Managers from accessing team payroll records or employee salaries', async () => {
    const mgrPayroll = await request(app).get('/api/payroll').set('Authorization', `Bearer ${managerToken}`);
    expect(mgrPayroll.statusCode).toBe(403);

    const mgrViewWorker = await request(app)
      .get(`/api/employees/${empWorker._id}`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(mgrViewWorker.statusCode).toBe(200);
    expect(mgrViewWorker.body.data.salary).toBeUndefined();
    expect(mgrViewWorker.body.data.canViewSalary).toBe(false);
  });
});

describe('Department CRUD & Active Employee Guard', () => {
  let tempDeptId;

  it('creates, updates, and prevents deleting a department with active employees', async () => {
    const createRes = await request(app)
      .post('/api/departments')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ name: 'Finance', code: 'FIN', description: 'Corporate Finance' });
    expect(createRes.statusCode).toBe(201);
    tempDeptId = createRes.body.data._id;

    // Attempting to delete IT department (which has active employees) must fail with 409
    const blockDelete = await request(app)
      .delete(`/api/departments/${itDept._id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(blockDelete.statusCode).toBe(409);

    // Deleting empty Finance department succeeds (soft deactivate)
    const allowDelete = await request(app)
      .delete(`/api/departments/${tempDeptId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(allowDelete.statusCode).toBe(200);
    expect(allowDelete.body.data.isActive).toBe(false);
  });
});

describe('Employee CRUD, Duplicate Guards & Soft Deactivation', () => {
  let createdEmpId;

  it('creates an employee, rejects duplicate email/ID, updates, deactivates, and reactivates', async () => {
    const createRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employeeId: 'TST-900',
        firstName: 'Alex',
        lastName: 'Rivera',
        email: 'alex.rivera@test.local',
        phone: '+1-555-9000',
        department: String(itDept._id),
        designation: 'QA Engineer',
        joiningDate: '2026-01-15',
        salary: { basic: 50000, hra: 10000, otherAllowances: 2000, deductions: 1000, currency: 'INR' },
      });
    expect(createRes.statusCode).toBe(201);
    createdEmpId = createRes.body.data._id;

    // Duplicate email rejected
    const dupRes = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employeeId: 'TST-901',
        firstName: 'Dup',
        lastName: 'User',
        email: 'alex.rivera@test.local',
        phone: '+1-555-9001',
        department: String(itDept._id),
        designation: 'QA',
        joiningDate: '2026-01-15',
      });
    expect(dupRes.statusCode).toBe(409);

    // Update
    const updateRes = await request(app)
      .put(`/api/employees/${createdEmpId}`)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ designation: 'Senior QA Engineer' });
    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.data.designation).toBe('Senior QA Engineer');

    // Soft Deactivate
    const delRes = await request(app)
      .delete(`/api/employees/${createdEmpId}`)
      .set('Authorization', `Bearer ${hrToken}`);
    expect(delRes.statusCode).toBe(200);
    expect(delRes.body.data.employmentStatus).toBe('Inactive');

    // Reactivate
    const reactRes = await request(app)
      .patch(`/api/employees/${createdEmpId}/reactivate`)
      .set('Authorization', `Bearer ${hrToken}`);
    expect(reactRes.statusCode).toBe(200);
    expect(reactRes.body.data.employmentStatus).toBe('Active');
  });
});

describe('Attendance Rules', () => {
  it('prevents checkout before checkin, enforces single checkin per day, and calculates hours on checkout', async () => {
    const badOut = await request(app)
      .post('/api/attendance/check-out')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({});
    expect(badOut.statusCode).toBe(400);

    const checkInRes = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ notes: 'Morning arrival' });
    expect(checkInRes.statusCode).toBe(201);

    const dupIn = await request(app)
      .post('/api/attendance/check-in')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({});
    expect(dupIn.statusCode).toBe(409);

    const checkOutRes = await request(app)
      .post('/api/attendance/check-out')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ notes: 'Done for day' });
    expect(checkOutRes.statusCode).toBe(200);
    expect(typeof checkOutRes.body.data.workingHours).toBe('number');
  });
});

describe('Leave Workflow & Balance Calculations', () => {
  let leaveId;

  it('applies leave, rejects overlaps, blocks self-approval, and updates leave balance on approval', async () => {
    const year = new Date().getUTCFullYear();
    const startDate = `${year}-12-01`;
    const endDate = `${year}-12-03`;

    const applyRes = await request(app)
      .post('/api/leaves')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ leaveType: 'Casual Leave', startDate, endDate, reason: 'Family event' });
    expect(applyRes.statusCode).toBe(201);
    expect(applyRes.body.data.totalDays).toBe(3);
    leaveId = applyRes.body.data._id;

    // Overlap must be rejected
    const overlapRes = await request(app)
      .post('/api/leaves')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ leaveType: 'Casual Leave', startDate: `${year}-12-02`, endDate: `${year}-12-04`, reason: 'Overlap test' });
    expect(overlapRes.statusCode).toBe(409);

    // Employee cannot approve own leave
    const selfApprove = await request(app)
      .put(`/api/leaves/${leaveId}/approve`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({});
    expect(selfApprove.statusCode).toBe(403);

    // Department manager approves team member's leave
    const approveRes = await request(app)
      .put(`/api/leaves/${leaveId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ comment: 'Approved by IT Lead' });
    expect(approveRes.statusCode).toBe(200);
    expect(approveRes.body.data.status).toBe('Approved');

    // Verify leave balance updated: pending=0, used=3
    const myLeavesRes = await request(app)
      .get(`/api/leaves/my?year=${year}`)
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(myLeavesRes.statusCode).toBe(200);
    expect(myLeavesRes.body.data.balance.balances.casual.used).toBe(3);
    expect(myLeavesRes.body.data.balance.balances.casual.pending).toBe(0);
  });
});

describe('Payroll Calculations & Payslip PDF', () => {
  let payrollId;

  it('calculates Net Salary accurately, generates PDF payslip, and enforces ownership', async () => {
    const createRes = await request(app)
      .post('/api/payroll')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        employee: String(empWorker._id),
        month: 10,
        year: 2026,
        basicSalary: 6000,
        houseRentAllowance: 1500,
        otherAllowances: 500,
        bonus: 400,
        deductions: 600,
        paymentStatus: 'Paid',
      });
    expect(createRes.statusCode).toBe(201);
    // Net = 6000 + 1500 + 500 + 400 - 600 = 7800
    expect(createRes.body.data.netSalary).toBe(7800);
    payrollId = createRes.body.data._id;

    // Employee can view own payslip
    const ownRes = await request(app)
      .get(`/api/payroll/${payrollId}`)
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(ownRes.statusCode).toBe(200);

    // Employee can download PDF payslip
    const pdfRes = await request(app)
      .get(`/api/payroll/${payrollId}/payslip`)
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers['content-type']).toContain('application/pdf');

    // Manager cannot view another employee's payslip
    const mgrDenied = await request(app)
      .get(`/api/payroll/${payrollId}`)
      .set('Authorization', `Bearer ${managerToken}`);
    expect(mgrDenied.statusCode).toBe(403);
  });
});

describe('Dashboard APIs & Error Handling', () => {
  it('returns real MongoDB stats and chart data', async () => {
    const statsRes = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(statsRes.statusCode).toBe(200);
    expect(statsRes.body.data.kpis.totalEmployees).toBeGreaterThanOrEqual(4);
    expect(statsRes.body.data.kpis.totalDepartments).toBeGreaterThanOrEqual(2);

    const chartsRes = await request(app)
      .get('/api/dashboard/charts?months=6')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(chartsRes.statusCode).toBe(200);
    expect(chartsRes.body.data.employeeGrowth).toHaveLength(6);
    expect(Array.isArray(chartsRes.body.data.deptDistribution)).toBe(true);
  });

  it('returns 404 JSON on unknown routes', async () => {
    const res = await request(app).get('/api/non-existent-endpoint');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
