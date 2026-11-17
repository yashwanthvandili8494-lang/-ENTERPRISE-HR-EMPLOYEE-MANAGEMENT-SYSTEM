const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

const env = require('./config/env');
const { sanitizeMiddleware } = require('./utils/sanitize');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const { jobRouter, candidateRouter, interviewRouter } = require('./routes/recruitmentRoutes');
const {
  dashboardRouter,
  notificationRouter,
  reportRouter,
  auditRouter,
  settingsRouter,
} = require('./routes/systemRoutes');

const app = express();

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS
const allowedOrigins = env.CLIENT_URL.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV !== 'production') {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting (disabled in test mode to allow rapid automated suites)
if (env.NODE_ENV !== 'test') {
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many authentication attempts, please wait 15 minutes.' },
  });

  app.use('/api', apiLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/forgot-password', authLimiter);
}

if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsers with strict size limits & cookie parser
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(sanitizeMiddleware);

// Only serve non-sensitive visual assets (logos & avatars) statically.
// Private employee documents, leave attachments, and resumes are ONLY served via authorized download endpoints.
app.use('/uploads/profiles', express.static(path.join(__dirname, 'uploads', 'profiles')));
app.use('/uploads/logos', express.static(path.join(__dirname, 'uploads', 'logos')));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Enterprise HR API is operational',
    data: {
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
  });
});

// Mount API routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/jobs', jobRouter);
app.use('/api/candidates', candidateRouter);
app.use('/api/interviews', interviewRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/reports', reportRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/settings', settingsRouter);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
