const express = require('express');
const attendanceController = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { checkInSchema, checkOutSchema, manualAttendanceSchema } = require('../validators/attendanceLeaveValidator');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(protect);

router.get('/my', attendanceController.getMyAttendance);
router.post('/check-in', validate(checkInSchema), attendanceController.checkIn);
router.post('/check-out', validate(checkOutSchema), attendanceController.checkOut);
router.post('/manual', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER), validate(manualAttendanceSchema), attendanceController.recordManualAttendance);
router.get('/', attendanceController.getAttendance);

module.exports = router;
