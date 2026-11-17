const mongoose = require('mongoose');

const companySettingsSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: 'PRIMARY_COMPANY_SETTINGS',
      unique: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
      default: 'Acme Enterprise Technologies',
    },
    logoPath: {
      type: String,
      default: null,
    },
    address: {
      type: String,
      trim: true,
      default: '100 Innovation Way, Suite 400, San Francisco, CA 94105',
    },
    phone: {
      type: String,
      trim: true,
      default: '+1 (415) 555-0190',
    },
    officialEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: 'hr@acme-enterprise.example.com',
    },
    website: {
      type: String,
      trim: true,
      default: 'https://acme-enterprise.example.com',
    },
    timezone: {
      type: String,
      default: 'UTC',
    },
    workingDays: {
      type: [String],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    workingHours: {
      startTime: { type: String, default: '09:00' },
      endTime: { type: String, default: '18:00' },
      lateThresholdMinutes: { type: Number, min: 0, max: 180, default: 15 },
      earlyDepartureThresholdMinutes: { type: Number, min: 0, max: 180, default: 15 },
      halfDayHours: { type: Number, min: 1, max: 8, default: 4 },
      standardDailyHours: { type: Number, min: 4, max: 16, default: 8 },
    },
    leavePolicies: {
      casual: { type: Number, min: 0, default: 12 },
      sick: { type: Number, min: 0, default: 10 },
      earned: { type: Number, min: 0, default: 15 },
      unpaid: { type: Number, min: 0, default: 365 },
      maternity: { type: Number, min: 0, default: 90 },
      paternity: { type: Number, min: 0, default: 14 },
      carryForwardMax: { type: Number, min: 0, default: 5 },
    },
    notificationPreferences: {
      inAppEnabled: { type: Boolean, default: true },
      emailEnabled: { type: Boolean, default: false },
      attendanceReminders: { type: Boolean, default: true },
      leaveAlerts: { type: Boolean, default: true },
      payrollAlerts: { type: Boolean, default: true },
      interviewAlerts: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CompanySettings', companySettingsSchema);
