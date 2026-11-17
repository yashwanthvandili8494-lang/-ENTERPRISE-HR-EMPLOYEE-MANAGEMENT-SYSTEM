const mongoose = require('mongoose');
const { EMPLOYMENT_TYPES, JOB_STATUSES } = require('../utils/constants');

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: 140,
    },
    code: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true,
    },
    requiredSkills: [{ type: String, trim: true }],
    experience: {
      type: String,
      required: [true, 'Experience requirement is required'],
      trim: true,
    },
    employmentType: {
      type: String,
      enum: EMPLOYMENT_TYPES,
      default: 'Full-Time',
    },
    location: {
      type: String,
      trim: true,
      default: 'Headquarters / Hybrid',
    },
    openingsCount: {
      type: Number,
      min: 1,
      default: 1,
    },
    applicationDeadline: {
      type: Date,
      required: [true, 'Application deadline is required'],
    },
    status: {
      type: String,
      enum: JOB_STATUSES,
      default: 'Open',
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

jobSchema.pre('validate', function ensureJobCode(next) {
  if (!this.code) {
    this.code = `JOB-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
  }
  next();
});

jobSchema.index({ department: 1, status: 1 });
jobSchema.index({ applicationDeadline: 1 });

module.exports = mongoose.model('Job', jobSchema);
