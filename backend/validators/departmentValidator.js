const { z } = require('zod');

const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, 'Department name is required').max(100),
  code: z.string().trim().min(2, 'Department code is required').max(16),
  description: z.string().trim().max(500).optional().default(''),
  manager: z.string().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

const updateDepartmentSchema = createDepartmentSchema.partial();

module.exports = {
  createDepartmentSchema,
  updateDepartmentSchema,
};
