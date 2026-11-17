const mongoose = require('mongoose');
const { EMPLOYMENT_TYPES, EMPLOYMENT_STATUSES, GENDERS } = require('../utils/constants');

const documentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: { type: String, trim: true, default: 'General' },
    filePath: { type: String, required: true },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: 0 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const employeeSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: [true, 'Employee ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
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
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    gender: {
      type: String,
      enum: GENDERS,
      default: 'Prefer Not to Say',
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    profilePhoto: {
      type: String,
      default: null,
    },
    address: {
      street: { type: String, trim: true, default: '' },
      city: { type: String, trim: true, default: '' },
      state: { type: String, trim: true, default: '' },
      postalCode: { type: String, trim: true, default: '' },
      country: { type: String, trim: true, default: '' },
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: [true, 'Department is required'],
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true,
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required'],
    },
    employmentType: {
      type: String,
      enum: EMPLOYMENT_TYPES,
      default: 'Full-Time',
    },
    reportingManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      default: null,
    },
    salary: {
      basic: { type: Number, min: 0, default: 0 },
      hra: { type: Number, min: 0, default: 0 },
      otherAllowances: { type: Number, min: 0, default: 0 },
      deductions: { type: Number, min: 0, default: 0 },
      currency: { type: String, default: 'INR', uppercase: true, trim: true },
    },
    employmentStatus: {
      type: String,
      enum: EMPLOYMENT_STATUSES,
      default: 'Active',
    },
    emergencyContact: {
      name: { type: String, trim: true, default: '' },
      relationship: { type: String, trim: true, default: '' },
      phone: { type: String, trim: true, default: '' },
    },
    documents: [documentSchema],
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deactivatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

employeeSchema.virtual('fullName').get(function getFullName() {
  return `${this.firstName} ${this.lastName}`.trim();
});

employeeSchema.index({ department: 1, employmentStatus: 1 });
employeeSchema.index({ designation: 1 });
employeeSchema.index({ firstName: 'text', lastName: 'text', email: 'text', employeeId: 'text', designation: 'text' });

module.exports = mongoose.model('Employee', employeeSchema);
