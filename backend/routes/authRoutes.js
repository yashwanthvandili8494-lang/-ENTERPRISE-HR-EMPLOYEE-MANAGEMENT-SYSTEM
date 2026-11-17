const express = require('express');
const authController = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  createUserSchema,
  updateUserSchema,
} = require('../validators/authValidator');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.put('/me', protect, authController.updateMyProfile);
router.post('/change-password', protect, validate(changePasswordSchema), authController.changePassword);

// Super Admin User Management
router.get('/users', protect, authorize(ROLES.SUPER_ADMIN), authController.listUsers);
router.post('/users', protect, authorize(ROLES.SUPER_ADMIN), validate(createUserSchema), authController.createUser);
router.put('/users/:id', protect, authorize(ROLES.SUPER_ADMIN), validate(updateUserSchema), authController.updateUser);

module.exports = router;
