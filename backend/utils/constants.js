const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  HR_MANAGER: 'HR_MANAGER',
  DEPARTMENT_MANAGER: 'DEPARTMENT_MANAGER',
  EMPLOYEE: 'EMPLOYEE',
};

const ALL_ROLES = Object.values(ROLES);

const EMPLOYMENT_TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Intern'];
const EMPLOYMENT_STATUSES = ['Active', 'Inactive', 'On Leave', 'Terminated'];
const GENDERS = ['Male', 'Female', 'Non-Binary', 'Prefer Not to Say'];

const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Half-Day', 'Late', 'On Leave'];

const LEAVE_TYPES = [
  'Casual Leave',
  'Sick Leave',
  'Earned Leave',
  'Unpaid Leave',
  'Maternity Leave',
  'Paternity Leave',
];

const LEAVE_TYPE_KEY_MAP = {
  'Casual Leave': 'casual',
  'Sick Leave': 'sick',
  'Earned Leave': 'earned',
  'Unpaid Leave': 'unpaid',
  'Maternity Leave': 'maternity',
  'Paternity Leave': 'paternity',
};

const LEAVE_STATUSES = ['Pending', 'Approved', 'Rejected', 'Cancelled'];

const PAYROLL_STATUSES = ['Pending', 'Processed', 'Paid'];

const CANDIDATE_STATUSES = [
  'Applied',
  'Shortlisted',
  'Interview Scheduled',
  'Selected',
  'Rejected',
  'Hired',
];

const JOB_STATUSES = ['Open', 'Closed', 'On Hold'];
const INTERVIEW_MODES = ['In-Person', 'Video', 'Phone'];
const INTERVIEW_STATUSES = ['Scheduled', 'Completed', 'Cancelled', 'No-Show'];

const DEFAULT_DEPARTMENTS = [
  { name: 'Human Resources', code: 'HR', description: 'Talent acquisition, employee relations, benefits, and compliance.' },
  { name: 'Information Technology', code: 'IT', description: 'Software engineering, infrastructure, security, and technical operations.' },
  { name: 'Finance', code: 'FIN', description: 'Accounting, payroll oversight, financial planning, and audits.' },
  { name: 'Marketing', code: 'MKT', description: 'Brand management, demand generation, communications, and product marketing.' },
  { name: 'Sales', code: 'SLS', description: 'Enterprise revenue, business development, and account management.' },
  { name: 'Operations', code: 'OPS', description: 'Business operations, procurement, facilities, and process excellence.' },
  { name: 'Customer Support', code: 'SUP', description: 'Customer success, technical support, and service level delivery.' },
];

module.exports = {
  ROLES,
  ALL_ROLES,
  EMPLOYMENT_TYPES,
  EMPLOYMENT_STATUSES,
  GENDERS,
  ATTENDANCE_STATUSES,
  LEAVE_TYPES,
  LEAVE_TYPE_KEY_MAP,
  LEAVE_STATUSES,
  PAYROLL_STATUSES,
  CANDIDATE_STATUSES,
  JOB_STATUSES,
  INTERVIEW_MODES,
  INTERVIEW_STATUSES,
  DEFAULT_DEPARTMENTS,
};
