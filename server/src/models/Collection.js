const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema(
  {
    receiptNo: {
      type: String,
      unique: true,
      trim: true,
    },
    loan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Loan',
      required: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    amountPaid: {
      type: Number,
      required: [true, 'Collection amount is required'],
      min: [1, 'Amount must be at least 1'],
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'UPI', 'Bank Transfer', 'Cheque'],
      default: 'Cash',
    },
    collectedBy: {
      type: String,
      default: 'Field Agent',
      trim: true,
    },
    routeArea: {
      type: String,
      trim: true,
      index: true,
    },
    transactionRef: {
      type: String,
      trim: true,
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

// Auto-generate receiptNo before save
collectionSchema.pre('save', async function (next) {
  if (!this.receiptNo) {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await mongoose.model('Collection').countDocuments();
    this.receiptNo = `REC-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Collection', collectionSchema);
