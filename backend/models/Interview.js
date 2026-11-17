const mongoose = require('mongoose');
const { INTERVIEW_MODES, INTERVIEW_STATUSES } = require('../utils/constants');

const interviewSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: [true, 'Candidate is required'],
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job is required'],
    },
    interviewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled date and time is required'],
    },
    durationMinutes: {
      type: Number,
      min: 15,
      max: 480,
      default: 60,
    },
    mode: {
      type: String,
      enum: INTERVIEW_MODES,
      default: 'Video',
    },
    locationOrLink: {
      type: String,
      trim: true,
      default: '',
    },
    feedback: {
      type: String,
      trim: true,
      default: '',
      maxlength: 3000,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    status: {
      type: String,
      enum: INTERVIEW_STATUSES,
      default: 'Scheduled',
    },
    scheduledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

interviewSchema.index({ candidate: 1, scheduledAt: -1 });
interviewSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.model('Interview', interviewSchema);
