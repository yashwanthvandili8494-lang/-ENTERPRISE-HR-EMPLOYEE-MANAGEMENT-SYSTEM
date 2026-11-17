const mongoose = require('mongoose');
const { PAYROLL_STATUSES } = require('../utils/constants');

const payrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee is required'],
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
    },
    salaryMonth: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}$/, 'salaryMonth must be YYYY-MM'],
    },
    basicSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    houseRentAllowance: {
      type: Number,
      min: 0,
      default: 0,
    },
    otherAllowances: {
      type: Number,
      min: 0,
      default: 0,
    },
    bonus: {
      type: Number,
      min: 0,
      default: 0,
    },
    deductions: {
      type: Number,
      min: 0,
      default: 0,
    },
    netSalary: {
      type: Number,
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: PAYROLL_STATUSES,
      default: 'Pending',
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

payrollSchema.pre('validate', function computeNetSalary(next) {
  const basic = Number(this.basicSalary) || 0;
  const hra = Number(this.houseRentAllowance) || 0;
  const other = Number(this.otherAllowances) || 0;
  const bonus = Number(this.bonus) || 0;
  const deductions = Number(this.deductions) || 0;
  this.netSalary = Math.round((basic + hra + other + bonus - deductions) * 100) / 100;
  if (this.year && this.month) {
    this.salaryMonth = `${this.year}-${String(this.month).padStart(2, '0')}`;
  }
  next();
});

payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ salaryMonth: 1, paymentStatus: 1 });

module.exports = mongoose.model('Payroll', payrollSchema);
