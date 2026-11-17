const express = require('express');
const leaveController = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createLeaveSchema, leaveDecisionSchema } = require('../validators/attendanceLeaveValidator');
const { uploadLeaveDoc } = require('../middleware/upload');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(protect);

router.get('/my', leaveController.getMyLeaves);
router.get('/', leaveController.getLeaves);
router.post('/', uploadLeaveDoc.single('supportingDocument'), validate(createLeaveSchema), leaveController.applyLeave);

router.put(
  '/:id/approve',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER),
  validate(leaveDecisionSchema),
  leaveController.approveLeave
);
router.put(
  '/:id/reject',
  authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER),
  validate(leaveDecisionSchema),
  leaveController.rejectLeave
);
router.put('/:id/cancel', leaveController.cancelLeave);
router.get('/:id/document', leaveController.downloadLeaveDocument);

module.exports = router;
