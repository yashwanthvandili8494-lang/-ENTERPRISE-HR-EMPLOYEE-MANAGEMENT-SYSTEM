const express = require('express');
const departmentController = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createDepartmentSchema, updateDepartmentSchema } = require('../validators/departmentValidator');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(protect);

router.get('/', departmentController.getDepartments);
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER), validate(createDepartmentSchema), departmentController.createDepartment);
router.get('/:id', departmentController.getDepartmentById);
router.put('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER), validate(updateDepartmentSchema), departmentController.updateDepartment);
router.delete('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER), departmentController.deleteDepartment);

module.exports = router;
