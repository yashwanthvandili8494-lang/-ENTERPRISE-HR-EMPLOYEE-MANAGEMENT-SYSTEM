/**
 * Development-only Demo Data Seeder.
 * Strictly refuses to run in production environments.
 */
const mongoose = require('mongoose');
const env = require('../config/env');
const connectDB = require('../config/db');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Department = require('../models/Department');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const LeaveBalance = require('../models/LeaveBalance');
const Payroll = require('../models/Payroll');
const Job = require('../models/Job');
const Candidate = require('../models/Candidate');
const Interview = require('../models/Interview');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const CompanySettings = require('../models/CompanySettings');
const { DEFAULT_DEPARTMENTS, ROLES } = require('../utils/constants');
const { getDateKeyInTimezone } = require('../utils/timezone');

async function seedDemo() {
  if (env.NODE_ENV === 'production') {
    console.error('Refusing to run demo seed script in production!');
    process.exit(1);
  }

  await connectDB();
  console.log('Clearing existing development collections...');
  await Promise.all([
    User.deleteMany({}),
    Employee.deleteMany({}),
    Department.deleteMany({}),
    Attendance.deleteMany({}),
    Leave.deleteMany({}),
    LeaveBalance.deleteMany({}),
    Payroll.deleteMany({}),
    Job.deleteMany({}),
    Candidate.deleteMany({}),
    Interview.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
    CompanySettings.deleteMany({}),
  ]);

  // 1. Company Settings
  const settings = await CompanySettings.create({
    singletonKey: 'PRIMARY_COMPANY_SETTINGS',
    companyName: 'Vanguard Enterprise Corp',
    address: '450 Enterprise Plaza, Floor 12, Austin, TX 78701',
    phone: '+1 (512) 555-0148',
    officialEmail: 'hr@vanguard-demo.local',
    website: 'https://vanguard-demo.local',
    timezone: 'UTC',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    workingHours: {
      startTime: '09:00',
      endTime: '18:00',
      lateThresholdMinutes: 15,
      earlyDepartureThresholdMinutes: 15,
      halfDayHours: 4,
      standardDailyHours: 8,
    },
  });

  // 2. Default 7 Departments
  const departments = await Department.insertMany(DEFAULT_DEPARTMENTS);
  const deptByCode = Object.fromEntries(departments.map((d) => [d.code, d]));

  const now = new Date();
  const monthsAgo = (m) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - m, 10));
  const upcomingBday = (daysAhead) => {
    const d = new Date(now.getTime() + daysAhead * 86400000);
    return new Date(Date.UTC(1992, d.getUTCMonth(), d.getUTCDate()));
  };

  // 3. Employees
  const empSeed = [
    {
      employeeId: 'EMP-1001',
      firstName: 'Elena',
      lastName: 'Vance',
      email: 'admin@enterprisehr.demo',
      phone: '+91-98100-50101',
      gender: 'Female',
      dateOfBirth: upcomingBday(5),
      department: deptByCode.OPS._id,
      designation: 'Chief Executive Officer',
      joiningDate: monthsAgo(18),
      employmentType: 'Full-Time',
      salary: { basic: 180000, hra: 45000, otherAllowances: 25000, deductions: 18000, currency: 'INR' },
      employmentStatus: 'Active',
      role: ROLES.SUPER_ADMIN,
    },
    {
      employeeId: 'EMP-1002',
      firstName: 'Marcus',
      lastName: 'Sterling',
      email: 'hr@enterprisehr.demo',
      phone: '+91-98100-50102',
      gender: 'Male',
      dateOfBirth: upcomingBday(14),
      department: deptByCode.HR._id,
      designation: 'VP of Human Resources',
      joiningDate: monthsAgo(15),
      employmentType: 'Full-Time',
      salary: { basic: 115000, hra: 30000, otherAllowances: 15000, deductions: 11000, currency: 'INR' },
      employmentStatus: 'Active',
      role: ROLES.HR_MANAGER,
    },
    {
      employeeId: 'EMP-1003',
      firstName: 'Priya',
      lastName: 'Nair',
      email: 'manager@enterprisehr.demo',
      phone: '+91-98100-50103',
      gender: 'Female',
      dateOfBirth: upcomingBday(22),
      department: deptByCode.IT._id,
      designation: 'Engineering Director',
      joiningDate: monthsAgo(12),
      employmentType: 'Full-Time',
      salary: { basic: 135000, hra: 35000, otherAllowances: 18000, deductions: 13500, currency: 'INR' },
      employmentStatus: 'Active',
      role: ROLES.DEPARTMENT_MANAGER,
    },
    {
      employeeId: 'EMP-1004',
      firstName: 'Daniel',
      lastName: 'Brooks',
      email: 'employee@enterprisehr.demo',
      phone: '+91-98100-50104',
      gender: 'Male',
      dateOfBirth: upcomingBday(9),
      department: deptByCode.IT._id,
      designation: 'Senior Software Engineer',
      joiningDate: monthsAgo(8),
      employmentType: 'Full-Time',
      salary: { basic: 85000, hra: 22000, otherAllowances: 10000, deductions: 7500, currency: 'INR' },
      employmentStatus: 'Active',
      role: ROLES.EMPLOYEE,
    },
    {
      employeeId: 'EMP-1005',
      firstName: 'Sophia',
      lastName: 'Chen',
      email: 'sophia.chen@enterprisehr.demo',
      phone: '+91-98100-50105',
      gender: 'Female',
      dateOfBirth: new Date('1994-03-18'),
      department: deptByCode.IT._id,
      designation: 'Full-Stack Developer',
      joiningDate: monthsAgo(5),
      employmentType: 'Full-Time',
      salary: { basic: 72000, hra: 18000, otherAllowances: 8000, deductions: 6000, currency: 'INR' },
      employmentStatus: 'Active',
      role: ROLES.EMPLOYEE,
    },
    {
      employeeId: 'EMP-1006',
      firstName: 'Liam',
      lastName: 'OConnor',
      email: 'liam.oconnor@enterprisehr.demo',
      phone: '+91-98100-50106',
      gender: 'Male',
      dateOfBirth: new Date('1989-07-24'),
      department: deptByCode.FIN._id,
      designation: 'Finance Controller',
      joiningDate: monthsAgo(11),
      employmentType: 'Full-Time',
      salary: { basic: 105000, hra: 26000, otherAllowances: 12000, deductions: 9500, currency: 'INR' },
      employmentStatus: 'Active',
      role: ROLES.DEPARTMENT_MANAGER,
    },
    {
      employeeId: 'EMP-1007',
      firstName: 'Amara',
      lastName: 'Okafor',
      email: 'amara.okafor@enterprisehr.demo',
      phone: '+91-98100-50107',
      gender: 'Female',
      dateOfBirth: upcomingBday(28),
      department: deptByCode.MKT._id,
      designation: 'Growth Marketing Lead',
      joiningDate: monthsAgo(4),
      employmentType: 'Full-Time',
      salary: { basic: 68000, hra: 17000, otherAllowances: 7500, deductions: 5500, currency: 'INR' },
      employmentStatus: 'Active',
      role: ROLES.EMPLOYEE,
    },
    {
      employeeId: 'EMP-1008',
      firstName: 'Carlos',
      lastName: 'Mendez',
      email: 'carlos.mendez@enterprisehr.demo',
      phone: '+91-98100-50108',
      gender: 'Male',
      dateOfBirth: new Date('1991-11-02'),
      department: deptByCode.SLS._id,
      designation: 'Enterprise Account Executive',
      joiningDate: monthsAgo(3),
      employmentType: 'Full-Time',
      salary: { basic: 64000, hra: 16000, otherAllowances: 12000, deductions: 5200, currency: 'INR' },
      employmentStatus: 'Active',
      role: ROLES.EMPLOYEE,
    },
    {
      employeeId: 'EMP-1009',
      firstName: 'Hannah',
      lastName: 'Alvarez',
      email: 'hannah.alvarez@enterprisehr.demo',
      phone: '+91-98100-50109',
      gender: 'Female',
      dateOfBirth: new Date('1995-05-12'),
      department: deptByCode.SUP._id,
      designation: 'Customer Success Specialist',
      joiningDate: monthsAgo(2),
      employmentType: 'Full-Time',
      salary: { basic: 48000, hra: 12000, otherAllowances: 5000, deductions: 3800, currency: 'INR' },
      employmentStatus: 'Active',
      role: ROLES.EMPLOYEE,
    },
    {
      employeeId: 'EMP-1010',
      firstName: 'Noah',
      lastName: 'Patel',
      email: 'noah.patel@enterprisehr.demo',
      phone: '+91-98100-50110',
      gender: 'Male',
      dateOfBirth: new Date('1993-08-19'),
      department: deptByCode.OPS._id,
      designation: 'Operations Analyst',
      joiningDate: monthsAgo(1),
      employmentType: 'Contract',
      salary: { basic: 52000, hra: 13000, otherAllowances: 4500, deductions: 4000, currency: 'INR' },
      employmentStatus: 'Active',
      role: ROLES.EMPLOYEE,
    },
    {
      employeeId: 'EMP-1011',
      firstName: 'Chloe',
      lastName: 'Bennett',
      email: 'chloe.bennett@enterprisehr.demo',
      phone: '+91-98100-50111',
      gender: 'Female',
      dateOfBirth: new Date('1990-02-09'),
      department: deptByCode.MKT._id,
      designation: 'Content Strategist',
      joiningDate: monthsAgo(9),
      employmentType: 'Full-Time',
      salary: { basic: 58000, hra: 14500, otherAllowances: 5000, deductions: 4500, currency: 'INR' },
      employmentStatus: 'Inactive',
      deactivatedAt: monthsAgo(1),
      role: ROLES.EMPLOYEE,
    },
  ];

  const demoPassword = process.env.DEMO_SEED_PASSWORD || 'DemoPass@123';
  const createdEmployees = [];
  const createdUsers = [];

  for (const item of empSeed) {
    const { role, ...empData } = item;
    const emp = await Employee.create({
      ...empData,
      address: {
        street: '100 Corporate Blvd',
        city: 'Austin',
        state: 'TX',
        postalCode: '78701',
        country: 'USA',
      },
      emergencyContact: {
        name: 'Primary Emergency Contact',
        relationship: 'Family',
        phone: '+1-512-555-9999',
      },
    });
    const user = await User.create({
      name: `${emp.firstName} ${emp.lastName}`,
      email: emp.email,
      password: demoPassword,
      role,
      employee: emp._id,
      isActive: emp.employmentStatus === 'Active',
    });
    emp.user = user._id;
    await emp.save();

    await LeaveBalance.create({
      employee: emp._id,
      year: now.getUTCFullYear(),
    });

    createdEmployees.push(emp);
    createdUsers.push(user);
  }

  // Assign department managers & reporting managers
  await Department.findByIdAndUpdate(deptByCode.HR._id, { manager: createdEmployees[1]._id });
  await Department.findByIdAndUpdate(deptByCode.IT._id, { manager: createdEmployees[2]._id });
  await Department.findByIdAndUpdate(deptByCode.FIN._id, { manager: createdEmployees[5]._id });
  await Department.findByIdAndUpdate(deptByCode.OPS._id, { manager: createdEmployees[0]._id });

  await Employee.findByIdAndUpdate(createdEmployees[3]._id, { reportingManager: createdEmployees[2]._id });
  await Employee.findByIdAndUpdate(createdEmployees[4]._id, { reportingManager: createdEmployees[2]._id });

  // 4. Attendance records over last 15 days + today (for active employees except EMP-1004 so demo employee can test check-in)
  const activeEmps = createdEmployees.filter((e) => e.employmentStatus === 'Active');
  const attendanceDocs = [];
  for (let dayOffset = 14; dayOffset >= 0; dayOffset -= 1) {
    const d = new Date(Date.now() - dayOffset * 86400000);
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const dateKey = getDateKeyInTimezone(d, settings.timezone);

    activeEmps.forEach((emp, idx) => {
      // Leave EMP-1004 unchecked-in for today so live Check-In works immediately in demo
      if (dayOffset === 0 && emp.employeeId === 'EMP-1004') return;
      if (dayOffset === 0 && emp.employeeId === 'EMP-1009') return; // simulate 1 absent today

      const isLate = (idx + dayOffset) % 7 === 0;
      const checkIn = new Date(`${dateKey}T${isLate ? '09:32:00' : '08:55:00'}.000Z`);
      const checkOut = dayOffset === 0 ? null : new Date(`${dateKey}T17:45:00.000Z`);
      const workingHours = checkOut ? Math.round(((checkOut - checkIn) / 3600000) * 100) / 100 : 0;

      attendanceDocs.push({
        employee: emp._id,
        dateKey,
        date: new Date(`${dateKey}T00:00:00.000Z`),
        checkIn,
        checkOut,
        workingHours,
        overtimeHours: workingHours > 8 ? Math.round((workingHours - 8) * 100) / 100 : 0,
        status: isLate ? 'Late' : 'Present',
        isLate,
      });
    });
  }
  await Attendance.insertMany(attendanceDocs);

  // 5. Leaves
  const startNextWeek = new Date(Date.now() + 5 * 86400000);
  const endNextWeek = new Date(Date.now() + 7 * 86400000);
  const pastStart = new Date(Date.now() - 20 * 86400000);
  const pastEnd = new Date(Date.now() - 18 * 86400000);

  await Leave.create([
    {
      employee: createdEmployees[3]._id,
      leaveType: 'Casual Leave',
      startDate: startNextWeek,
      endDate: endNextWeek,
      totalDays: 3,
      reason: 'Family travel out of town',
      status: 'Pending',
      approvalHistory: [
        { action: 'SUBMITTED', by: createdUsers[3]._id, role: ROLES.EMPLOYEE, comment: 'Family travel out of town' },
      ],
    },
    {
      employee: createdEmployees[4]._id,
      leaveType: 'Sick Leave',
      startDate: pastStart,
      endDate: pastEnd,
      totalDays: 3,
      reason: 'Seasonal flu recovery',
      status: 'Approved',
      approvedBy: createdUsers[2]._id,
      approvalNotes: 'Approved. Wishing a speedy recovery.',
      approvalHistory: [
        { action: 'SUBMITTED', by: createdUsers[4]._id, role: ROLES.EMPLOYEE, comment: 'Seasonal flu recovery' },
        { action: 'APPROVED', by: createdUsers[2]._id, role: ROLES.DEPARTMENT_MANAGER, comment: 'Approved.' },
      ],
    },
    {
      employee: createdEmployees[6]._id,
      leaveType: 'Earned Leave',
      startDate: new Date(Date.now() + 10 * 86400000),
      endDate: new Date(Date.now() + 12 * 86400000),
      totalDays: 3,
      reason: 'Annual vacation',
      status: 'Pending',
      approvalHistory: [
        { action: 'SUBMITTED', by: createdUsers[6]._id, role: ROLES.EMPLOYEE, comment: 'Annual vacation' },
      ],
    },
  ]);

  await LeaveBalance.findOneAndUpdate(
    { employee: createdEmployees[3]._id, year: now.getUTCFullYear() },
    { $set: { 'balances.casual.pending': 3 } }
  );
  await LeaveBalance.findOneAndUpdate(
    { employee: createdEmployees[4]._id, year: now.getUTCFullYear() },
    { $set: { 'balances.sick.used': 3 } }
  );
  await LeaveBalance.findOneAndUpdate(
    { employee: createdEmployees[6]._id, year: now.getUTCFullYear() },
    { $set: { 'balances.earned.pending': 3 } }
  );

  // 6. Payroll for last 2 months
  for (let mOffset = 1; mOffset <= 2; mOffset += 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - mOffset, 1));
    const month = d.getUTCMonth() + 1;
    const year = d.getUTCFullYear();
    for (const emp of activeEmps) {
      await Payroll.create({
        employee: emp._id,
        month,
        year,
        basicSalary: emp.salary.basic,
        houseRentAllowance: emp.salary.hra,
        otherAllowances: emp.salary.otherAllowances,
        bonus: mOffset === 1 ? 5000 : 0,
        deductions: emp.salary.deductions,
        paymentStatus: 'Paid',
        paymentDate: new Date(Date.UTC(year, month - 1, 28)),
        generatedBy: createdUsers[1]._id,
      });
    }
  }

  // 7. Jobs, Candidates & Interviews
  const job1 = await Job.create({
    title: 'Staff Backend Engineer (Node.js)',
    code: 'JOB-ENG-01',
    department: deptByCode.IT._id,
    description: 'Design scalable microservices, MongoDB schemas, and secure APIs for enterprise HR workflows.',
    requiredSkills: ['Node.js', 'Express', 'MongoDB', 'TypeScript', 'AWS'],
    experience: '5+ years',
    employmentType: 'Full-Time',
    location: 'Austin, TX / Hybrid',
    openingsCount: 2,
    applicationDeadline: new Date(Date.now() + 30 * 86400000),
    status: 'Open',
    postedBy: createdUsers[1]._id,
  });

  const job2 = await Job.create({
    title: 'HR Business Partner',
    code: 'JOB-HR-02',
    department: deptByCode.HR._id,
    description: 'Partner with department heads on workforce planning, performance cycles, and employee engagement.',
    requiredSkills: ['HRIS', 'Employee Relations', 'Compensation', 'Analytics'],
    experience: '4+ years',
    employmentType: 'Full-Time',
    location: 'Remote (US)',
    openingsCount: 1,
    applicationDeadline: new Date(Date.now() + 20 * 86400000),
    status: 'Open',
    postedBy: createdUsers[1]._id,
  });

  const cand1 = await Candidate.create({
    job: job1._id,
    firstName: 'Aiden',
    lastName: 'Foster',
    email: 'aiden.foster@candidate.demo',
    phone: '+1-512-555-7701',
    experienceYears: 6,
    skills: ['Node.js', 'MongoDB', 'Docker', 'GraphQL'],
    status: 'Interview Scheduled',
    notes: 'Strong system design background.',
  });

  const cand2 = await Candidate.create({
    job: job1._id,
    firstName: 'Mei',
    lastName: 'Lin',
    email: 'mei.lin@candidate.demo',
    phone: '+1-512-555-7702',
    experienceYears: 7,
    skills: ['Node.js', 'Express', 'Kubernetes', 'MongoDB'],
    status: 'Selected',
    notes: 'Cleared final technical panel — ready to convert to employee.',
  });

  await Candidate.create({
    job: job2._id,
    firstName: 'Jordan',
    lastName: 'Hayes',
    email: 'jordan.hayes@candidate.demo',
    phone: '+1-512-555-7703',
    experienceYears: 5,
    skills: ['Talent Management', 'People Analytics', 'Compensation'],
    status: 'Shortlisted',
  });

  await Interview.create({
    candidate: cand1._id,
    job: job1._id,
    interviewers: [createdUsers[2]._id, createdUsers[1]._id],
    scheduledAt: new Date(Date.now() + 2 * 86400000),
    durationMinutes: 60,
    mode: 'Video',
    locationOrLink: 'https://meet.vanguard-demo.local/eng-panel-1',
    status: 'Scheduled',
    scheduledBy: createdUsers[1]._id,
  });

  // 8. Notifications & Audit Logs
  await Notification.create([
    {
      recipient: createdUsers[0]._id,
      type: 'LEAVE_SUBMITTED',
      title: 'Pending Leave Approval',
      message: 'Daniel Brooks requested 3 days of Casual Leave.',
      link: '/leaves',
    },
    {
      recipient: createdUsers[1]._id,
      type: 'INTERVIEW_SCHEDULED',
      title: 'Upcoming Candidate Interview',
      message: 'Technical panel scheduled with Aiden Foster for Staff Backend Engineer.',
      link: '/recruitment',
    },
    {
      recipient: createdUsers[3]._id,
      type: 'PAYROLL_PUBLISHED',
      title: 'Monthly Payslip Published',
      message: 'Your latest monthly payslip is ready to view and download.',
      link: '/payroll',
    },
  ]);

  await AuditLog.create([
    {
      user: createdUsers[0]._id,
      action: 'SYSTEM_DEMO_SEEDED',
      entityType: 'CompanySettings',
      entityId: String(settings._id),
      metadata: { environment: env.NODE_ENV, employeeCount: createdEmployees.length },
    },
    {
      user: createdUsers[1]._id,
      action: 'PAYROLL_BATCH_PUBLISHED',
      entityType: 'Payroll',
      metadata: { count: activeEmps.length * 2 },
    },
  ]);

  console.log('\nDemo seed completed successfully!');
  console.log('Development Demo Accounts (Password: ' + demoPassword + '):');
  console.log('  SUPER_ADMIN        -> admin@enterprisehr.demo');
  console.log('  HR_MANAGER         -> hr@enterprisehr.demo');
  console.log('  DEPARTMENT_MANAGER -> manager@enterprisehr.demo');
  console.log('  EMPLOYEE           -> employee@enterprisehr.demo');

  await mongoose.disconnect();
  process.exit(0);
}

seedDemo().catch((err) => {
  console.error('Demo seed failed:', err);
  process.exit(1);
});
