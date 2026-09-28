const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    phone: {
      type: String,
      default: '+91 98765 43210',
      trim: true,
    },
    role: {
      type: String,
      default: 'Branch Staff / Loan Officer',
      trim: true,
    },
    branch: {
      type: String,
      default: 'Surat Main Branch',
      trim: true,
    },
    employeeId: {
      type: String,
      trim: true,
    },
    avatarColor: {
      type: String,
      default: '#2563eb',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Online', 'Away', 'On Field'],
      default: 'Online',
    },
    dailyTarget: {
      type: Number,
      default: 50000,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-assign employeeId if missing
userSchema.pre('save', async function (next) {
  if (!this.employeeId) {
    const count = await mongoose.model('User').countDocuments();
    this.employeeId = `DDF-EMP-${String(count + 101).padStart(3, '0')}`;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
