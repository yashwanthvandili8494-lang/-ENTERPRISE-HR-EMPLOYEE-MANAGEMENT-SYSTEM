const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const notificationController = require('../controllers/notificationController');
const reportController = require('../controllers/reportController');
const auditController = require('../controllers/auditController');
const settingsController = require('../controllers/settingsController');
const { protect, authorize } = require('../middleware/auth');
const { uploadCompanyLogo } = require('../middleware/upload');
const { ROLES } = require('../utils/constants');

const dashboardRouter = express.Router();
dashboardRouter.use(protect);
dashboardRouter.get('/stats', dashboardController.getStats);
dashboardRouter.get('/charts', dashboardController.getCharts);

const notificationRouter = express.Router();
notificationRouter.use(protect);
notificationRouter.get('/', notificationController.getNotifications);
notificationRouter.put('/read-all', notificationController.markAllAsRead);
notificationRouter.put('/:id/read', notificationController.markAsRead);

const reportRouter = express.Router();
reportRouter.use(protect);
reportRouter.use(authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER));
reportRouter.get('/employees', reportController.getEmployeeReport);
reportRouter.get('/departments', reportController.getDepartmentReport);
reportRouter.get('/attendance', reportController.getAttendanceReport);
reportRouter.get('/leaves', reportController.getLeaveReport);
reportRouter.get('/payroll', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER), reportController.getPayrollReport);
reportRouter.get('/recruitment', authorize(ROLES.SUPER_ADMIN, ROLES.HR_MANAGER), reportController.getRecruitmentReport);

const auditRouter = express.Router();
auditRouter.use(protect);
auditRouter.get('/', authorize(ROLES.SUPER_ADMIN), auditController.getAuditLogs);

const settingsRouter = express.Router();
settingsRouter.use(protect);
settingsRouter.get('/', settingsController.getSettings);
settingsRouter.put('/', authorize(ROLES.SUPER_ADMIN), settingsController.updateSettings);
settingsRouter.post('/logo', authorize(ROLES.SUPER_ADMIN), uploadCompanyLogo.single('logo'), settingsController.uploadLogo);

module.exports = {
  dashboardRouter,
  notificationRouter,
  reportRouter,
  auditRouter,
  settingsRouter,
};
