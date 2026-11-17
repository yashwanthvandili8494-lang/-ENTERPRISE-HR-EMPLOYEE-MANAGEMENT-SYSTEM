const mongoose = require('mongoose');
const { CANDIDATE_STATUSES } = require('../utils/constants');

const candidateSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job opening is required'],
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: 80,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
    },
    resume: {
      fileName: { type: String, default: null },
      filePath: { type: String, default: null },
      mimeType: { type: String, default: null },
    },
    experienceYears: {
      type: Number,
      min: 0,
      default: 0,
    },
    skills: [{ type: String, trim: true }],
    status: {
      type: String,
      enum: CANDIDATE_STATUSES,
      default: 'Applied',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: 2000,
    },
    convertedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

candidateSchema.virtual('fullName').get(function getFullName() {
  return `${this.firstName} ${this.lastName}`.trim();
});

candidateSchema.index({ job: 1, email: 1 }, { unique: true });
candidateSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Candidate', candidateSchema);
