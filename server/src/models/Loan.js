const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema(
  {
    loanNumber: {
      type: String,
      unique: true,
      trim: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    loanAmount: {
      type: Number,
      required: [true, 'Loan amount is required'],
      min: [100, 'Loan amount must be at least 100'],
    },
    dailyEMI: {
      type: Number,
      required: [true, 'Daily EMI is required'],
      min: [1, 'Daily EMI must be at least 1'],
    },
    totalEMI: {
      type: Number,
      required: [true, 'Total EMI count is required'],
      default: 100, // standard 100 days
    },
    paidEMI: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    totalPaid: {
      type: Number,
      default: 0,
    },
    remainingBalance: {
      type: Number,
      required: true,
    },
    loanStartDate: {
      type: Date,
      default: Date.now,
    },
    loanEndDate: {
      type: Date,
    },
    collectorName: {
      type: String,
      default: 'Agent 1',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Completed', 'Overdue'],
      default: 'Active',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-generate loanNumber and compute end date if not set
loanSchema.pre('save', async function (next) {
  if (!this.loanNumber) {
    const count = await mongoose.model('Loan').countDocuments();
    const year = new Date().getFullYear();
    this.loanNumber = `LN-${year}-${String(count + 1001).padStart(4, '0')}`;
  }
  if (!this.loanEndDate && this.loanStartDate && this.totalEMI) {
    const end = new Date(this.loanStartDate);
    end.setDate(end.getDate() + this.totalEMI);
    this.loanEndDate = end;
  }
  next();
});

module.exports = mongoose.model('Loan', loanSchema);
