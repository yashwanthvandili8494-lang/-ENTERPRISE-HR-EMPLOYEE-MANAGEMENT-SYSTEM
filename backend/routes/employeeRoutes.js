const express = require('express');
const employeeController = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createEmployeeSchema, updateEmployeeSchema } = require('../validators/employeeValidator');
const { uploadProfilePhoto, uploadEmployeeDoc } = require('../middleware/upload');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(protect);

router.get('/', employeeController.getEmployees);
router.get('/export', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER), employeeController.exportEmployeesCsv);
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER), validate(createEmployeeSchema), employeeController.createEmployee);

router.get('/:id', employeeController.getEmployeeById);
router.put('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER), validate(updateEmployeeSchema), employeeController.updateEmployee);
router.delete('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER), employeeController.deactivateEmployee);
router.patch('/:id/reactivate', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER), employeeController.reactivateEmployee);

router.post('/:id/photo', uploadProfilePhoto.single('photo'), employeeController.uploadPhoto);
router.post(
  '/:id/documents',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER),
  uploadEmployeeDoc.single('document'),
  employeeController.uploadDocument
);
router.get('/:id/documents/:docId', employeeController.downloadDocument);

module.exports = router;
