const mongoose = require('mongoose');

const payoutTransactionSchema = new mongoose.Schema(
  {
    payoutId: {
      type: String,
      trim: true,
    },
    payoutDate: {
      type: Date,
      default: Date.now,
    },
    amount: {
      type: Number,
      required: [true, 'Payout amount is required'],
      min: [1, 'Amount must be greater than 0'],
    },
    payoutType: {
      type: String,
      enum: ['Interest', 'Principal', 'Both', 'Settlement'],
      default: 'Interest',
    },
    principalComponent: {
      type: Number,
      default: 0,
    },
    interestComponent: {
      type: Number,
      default: 0,
    },
    paymentMode: {
      type: String,
      enum: ['Bank Transfer', 'UPI', 'Cash', 'Cheque'],
      default: 'Bank Transfer',
    },
    transactionRef: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    recordedBy: {
      type: String,
      default: 'Admin',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const advanceFundSchema = new mongoose.Schema(
  {
    fundCode: {
      type: String,
      unique: true,
      trim: true,
    },
    investorName: {
      type: String,
      required: [true, 'Investor name is required'],
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    panNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: '',
    },
    aadharNumber: {
      type: String,
      trim: true,
      default: '',
    },
    amountInvested: {
      type: Number,
      required: [true, 'Advance fund / loan amount is required'],
      min: [1000, 'Minimum advance fund amount is ₹1,000'],
    },
    interestRate: {
      type: Number,
      required: [true, 'Interest rate is required'],
      min: [0, 'Interest rate cannot be negative'],
      default: 2, // 2% per month default
    },
    interestRateBasis: {
      type: String,
      enum: ['Monthly', 'Yearly'],
      default: 'Monthly',
    },
    payoutFrequency: {
      type: String,
      enum: ['Monthly', 'Quarterly', 'Yearly', 'At Maturity'],
      default: 'Monthly',
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    tenureMonths: {
      type: Number,
      default: 12,
    },
    maturityDate: {
      type: Date,
    },
    monthlyInterestAmount: {
      type: Number,
      default: 0,
    },
    totalExpectedInterest: {
      type: Number,
      default: 0,
    },
    totalPrincipalRepaid: {
      type: Number,
      default: 0,
    },
    totalInterestPaid: {
      type: Number,
      default: 0,
    },
    totalPaid: {
      type: Number,
      default: 0,
    },
    remainingPrincipal: {
      type: Number,
      default: function () {
        return this.amountInvested;
      },
    },
    status: {
      type: String,
      enum: ['Active', 'Matured', 'Closed'],
      default: 'Active',
      index: true,
    },
    bankDetails: {
      bankName: { type: String, default: '' },
      accountHolderName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      upiId: { type: String, default: '' },
    },
    securityCheque: {
      type: String,
      trim: true,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
    payoutHistory: [payoutTransactionSchema],
    createdBy: {
      type: String,
      default: 'Admin',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save calculation & fundCode generation
advanceFundSchema.pre('save', async function (next) {
  // Generate fundCode if missing
  if (!this.fundCode) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('AdvanceFund').countDocuments();
    this.fundCode = `ADV-${year}-${String(count + 1001).padStart(4, '0')}`;
  }

  // Calculate maturity date if not set
  if (!this.maturityDate && this.startDate && this.tenureMonths) {
    const matDate = new Date(this.startDate);
    matDate.setMonth(matDate.getMonth() + Number(this.tenureMonths));
    this.maturityDate = matDate;
  }

  // Calculate monthly interest amount
  const principal = Number(this.amountInvested) || 0;
  const rate = Number(this.interestRate) || 0;
  const effectiveMonthlyRate = this.interestRateBasis === 'Yearly' ? rate / 12 : rate;
  this.monthlyInterestAmount = Math.round((principal * effectiveMonthlyRate) / 100);

  // Total expected interest over tenure
  const tenure = Number(this.tenureMonths) || 12;
  this.totalExpectedInterest = Math.round(this.monthlyInterestAmount * tenure);

  // Calculate remaining principal and status
  const principalRepaid = Number(this.totalPrincipalRepaid) || 0;
  this.remainingPrincipal = Math.max(0, principal - principalRepaid);
  this.totalPaid = (Number(this.totalPrincipalRepaid) || 0) + (Number(this.totalInterestPaid) || 0);

  if (this.remainingPrincipal <= 0 && this.status !== 'Closed') {
    this.status = 'Closed';
  }

  next();
});

module.exports = mongoose.model('AdvanceFund', advanceFundSchema);
