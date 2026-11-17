const { z } = require('zod');
const { ATTENDANCE_STATUSES, LEAVE_TYPES } = require('../utils/constants');

const checkInSchema = z.object({
  notes: z.string().trim().max(500).optional().default(''),
});

const checkOutSchema = z.object({
  notes: z.string().trim().max(500).optional().default(''),
});

const manualAttendanceSchema = z.object({
  employee: z.string().min(1, 'Employee is required'),
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  checkIn: z.string().nullable().optional(),
  checkOut: z.string().nullable().optional(),
  status: z.enum(ATTENDANCE_STATUSES),
  notes: z.string().trim().max(500).optional().default(''),
});

const createLeaveSchema = z.object({
  leaveType: z.enum(LEAVE_TYPES),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  reason: z.string().trim().min(3, 'Reason must be at least 3 characters').max(1000),
});

const leaveDecisionSchema = z.object({
  comment: z.string().trim().max(500).optional().default(''),
});

module.exports = {
  checkInSchema,
  checkOutSchema,
  manualAttendanceSchema,
  createLeaveSchema,
  leaveDecisionSchema,
};
