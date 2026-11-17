const mongoose = require('mongoose');
const { LEAVE_TYPES, LEAVE_STATUSES } = require('../utils/constants');

const approvalHistorySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true },
    comment: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const leaveSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    leaveType: {
      type: String,
      enum: LEAVE_TYPES,
      required: [true, 'Leave type is required'],
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    totalDays: {
      type: Number,
      required: true,
      min: [0.5, 'Leave duration must be at least 0.5 day'],
    },
    reason: {
      type: String,
      required: [true, 'Leave reason is required'],
      trim: true,
      maxlength: 1000,
    },
    supportingDocument: {
      fileName: { type: String, default: null },
      filePath: { type: String, default: null },
      mimeType: { type: String, default: null },
    },
    status: {
      type: String,
      enum: LEAVE_STATUSES,
      default: 'Pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvalNotes: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    approvalHistory: [approvalHistorySchema],
  },
  { timestamps: true }
);

leaveSchema.index({ employee: 1, startDate: 1, endDate: 1 });
leaveSchema.index({ status: 1, createdAt: -1 });
leaveSchema.index({ employee: 1, status: 1 });

module.exports = mongoose.model('Leave', leaveSchema);
