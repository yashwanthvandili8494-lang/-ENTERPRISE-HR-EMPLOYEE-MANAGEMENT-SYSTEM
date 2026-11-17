const { z } = require('zod');
const { EMPLOYMENT_TYPES, EMPLOYMENT_STATUSES, GENDERS, ALL_ROLES } = require('../utils/constants');

const addressSchema = z
  .object({
    street: z.string().trim().optional().default(''),
    city: z.string().trim().optional().default(''),
    state: z.string().trim().optional().default(''),
    postalCode: z.string().trim().optional().default(''),
    country: z.string().trim().optional().default(''),
  })
  .optional();

const salarySchema = z
  .object({
    basic: z.coerce.number().min(0).default(0),
    hra: z.coerce.number().min(0).default(0),
    otherAllowances: z.coerce.number().min(0).default(0),
    deductions: z.coerce.number().min(0).default(0),
    currency: z.string().trim().toUpperCase().default('INR'),
  })
  .optional();

const emergencyContactSchema = z
  .object({
    name: z.string().trim().optional().default(''),
    relationship: z.string().trim().optional().default(''),
    phone: z.string().trim().optional().default(''),
  })
  .optional();

const createEmployeeSchema = z.object({
  employeeId: z.string().trim().min(2, 'Employee ID is required').max(32),
  firstName: z.string().trim().min(1, 'First name is required').max(80),
  lastName: z.string().trim().min(1, 'Last name is required').max(80),
  email: z.string().trim().email('Valid email is required'),
  phone: z.string().trim().min(5, 'Phone number is required').max(30),
  gender: z.enum(GENDERS).optional().default('Prefer Not to Say'),
  dateOfBirth: z.string().nullable().optional(),
  address: addressSchema,
  department: z.string().min(1, 'Department is required'),
  designation: z.string().trim().min(2, 'Designation is required'),
  joiningDate: z.string().min(1, 'Joining date is required'),
  employmentType: z.enum(EMPLOYMENT_TYPES).optional().default('Full-Time'),
  reportingManager: z.string().nullable().optional(),
  salary: salarySchema,
  employmentStatus: z.enum(EMPLOYMENT_STATUSES).optional().default('Active'),
  emergencyContact: emergencyContactSchema,
  createUserAccount: z.boolean().optional().default(false),
  accountRole: z.enum(ALL_ROLES).optional().default('EMPLOYEE'),
  accountPassword: z.string().min(8).optional(),
});

const updateEmployeeSchema = createEmployeeSchema.partial();

module.exports = {
  createEmployeeSchema,
  updateEmployeeSchema,
};
