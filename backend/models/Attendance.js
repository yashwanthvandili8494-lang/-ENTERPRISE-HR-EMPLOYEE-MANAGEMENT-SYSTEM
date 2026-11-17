const mongoose = require('mongoose');
const { ATTENDANCE_STATUSES } = require('../utils/constants');

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    // Normalized YYYY-MM-DD in company timezone for exact one-record-per-workday enforcement
    dateKey: {
      type: String,
      required: [true, 'Date key is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'dateKey must be YYYY-MM-DD'],
    },
    date: {
      type: Date,
      required: true,
    },
    checkIn: {
      type: Date,
      default: null,
    },
    checkOut: {
      type: Date,
      default: null,
    },
    workingHours: {
      type: Number,
      min: 0,
      default: 0,
    },
    overtimeHours: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ATTENDANCE_STATUSES,
      default: 'Present',
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    isEarlyDeparture: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
  },
  { timestamps: true }
);

attendanceSchema.index({ employee: 1, dateKey: 1 }, { unique: true });
attendanceSchema.index({ dateKey: 1, status: 1 });
attendanceSchema.index({ employee: 1, date: -1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
