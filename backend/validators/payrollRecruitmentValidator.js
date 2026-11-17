const { z } = require('zod');
const {
  PAYROLL_STATUSES,
  EMPLOYMENT_TYPES,
  JOB_STATUSES,
  CANDIDATE_STATUSES,
  INTERVIEW_MODES,
  INTERVIEW_STATUSES,
} = require('../utils/constants');

const createPayrollSchema = z.object({
  employee: z.string().min(1, 'Employee is required'),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  basicSalary: z.coerce.number().min(0),
  houseRentAllowance: z.coerce.number().min(0).optional().default(0),
  otherAllowances: z.coerce.number().min(0).optional().default(0),
  bonus: z.coerce.number().min(0).optional().default(0),
  deductions: z.coerce.number().min(0).optional().default(0),
  paymentStatus: z.enum(PAYROLL_STATUSES).optional().default('Pending'),
  paymentDate: z.string().nullable().optional(),
  notes: z.string().trim().max(500).optional().default(''),
});

const updatePayrollSchema = createPayrollSchema.partial();

const createJobSchema = z.object({
  title: z.string().trim().min(2, 'Job title is required').max(140),
  code: z.string().trim().max(32).optional(),
  department: z.string().min(1, 'Department is required'),
  description: z.string().trim().min(10, 'Description is required'),
  requiredSkills: z.union([z.array(z.string()), z.string()]).optional().default([]),
  experience: z.string().trim().min(1, 'Experience requirement is required'),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional().default('Full-Time'),
  location: z.string().trim().optional().default('Headquarters / Hybrid'),
  openingsCount: z.coerce.number().int().min(1).optional().default(1),
  applicationDeadline: z.string().min(1, 'Application deadline is required'),
  status: z.enum(JOB_STATUSES).optional().default('Open'),
});

const updateJobSchema = createJobSchema.partial();

const createCandidateSchema = z.object({
  job: z.string().min(1, 'Job opening is required'),
  firstName: z.string().trim().min(1, 'First name is required'),
  lastName: z.string().trim().min(1, 'Last name is required'),
  email: z.string().trim().email('Valid email is required'),
  phone: z.string().trim().min(5, 'Phone number is required'),
  experienceYears: z.coerce.number().min(0).optional().default(0),
  skills: z.union([z.array(z.string()), z.string()]).optional().default([]),
  status: z.enum(CANDIDATE_STATUSES).optional().default('Applied'),
  notes: z.string().trim().max(2000).optional().default(''),
});

const updateCandidateSchema = createCandidateSchema.partial();

const createInterviewSchema = z.object({
  candidate: z.string().min(1, 'Candidate is required'),
  job: z.string().optional(),
  interviewers: z.array(z.string()).optional().default([]),
  scheduledAt: z.string().min(1, 'Scheduled date/time is required'),
  durationMinutes: z.coerce.number().int().min(15).max(480).optional().default(60),
  mode: z.enum(INTERVIEW_MODES).optional().default('Video'),
  locationOrLink: z.string().trim().optional().default(''),
  feedback: z.string().trim().max(3000).optional().default(''),
  rating: z.coerce.number().min(1).max(5).nullable().optional(),
  status: z.enum(INTERVIEW_STATUSES).optional().default('Scheduled'),
});

const updateInterviewSchema = createInterviewSchema.partial();

module.exports = {
  createPayrollSchema,
  updatePayrollSchema,
  createJobSchema,
  updateJobSchema,
  createCandidateSchema,
  updateCandidateSchema,
  createInterviewSchema,
  updateInterviewSchema,
};
