const mongoose = require('mongoose');

const bucketSchema = new mongoose.Schema(
  {
    allocated: { type: Number, min: 0, default: 0 },
    used: { type: Number, min: 0, default: 0 },
    pending: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const leaveBalanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    balances: {
      casual: { type: bucketSchema, default: () => ({ allocated: 12, used: 0, pending: 0 }) },
      sick: { type: bucketSchema, default: () => ({ allocated: 10, used: 0, pending: 0 }) },
      earned: { type: bucketSchema, default: () => ({ allocated: 15, used: 0, pending: 0 }) },
      unpaid: { type: bucketSchema, default: () => ({ allocated: 365, used: 0, pending: 0 }) },
      maternity: { type: bucketSchema, default: () => ({ allocated: 90, used: 0, pending: 0 }) },
      paternity: { type: bucketSchema, default: () => ({ allocated: 14, used: 0, pending: 0 }) },
    },
  },
  { timestamps: true }
);

leaveBalanceSchema.index({ employee: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);
