const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    customerId: {
      type: String,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      trim: true,
      index: true,
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
    },
    collectorName: {
      type: String,
      default: 'Agent 1',
      trim: true,
    },
    kycDocument: {
      fileName: { type: String, default: '' },
      fileType: { type: String, default: '' },
      fileData: { type: String, default: '' }, // base64 representation or URL
      uploadedAt: { type: Date, default: Date.now },
    },
    status: {
      type: String,
      enum: ['Active', 'Completed', 'Overdue'],
      default: 'Active',
      index: true,
    },
    routeArea: {
      type: String,
      default: 'General',
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

// Auto-generate customerId before save if not provided
customerSchema.pre('save', async function (next) {
  if (!this.customerId) {
    const count = await mongoose.model('Customer').countDocuments();
    this.customerId = `CUST-${String(count + 1001).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Customer', customerSchema);
