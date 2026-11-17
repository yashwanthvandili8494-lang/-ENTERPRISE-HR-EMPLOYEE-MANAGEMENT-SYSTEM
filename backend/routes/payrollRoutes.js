const express = require('express');
const payrollController = require('../controllers/payrollController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createPayrollSchema, updatePayrollSchema } = require('../validators/payrollRecruitmentValidator');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(protect);

router.get('/my', payrollController.getMyPayrolls);
router.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER), payrollController.getPayrolls);
router.post('/', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER), validate(createPayrollSchema), payrollController.createPayroll);
router.get('/:id/payslip', payrollController.downloadPayslipPdf);
router.get('/:id', payrollController.getPayrollById);
router.put('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER), validate(updatePayrollSchema), payrollController.updatePayroll);

module.exports = router;
