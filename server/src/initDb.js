const path = require('path');
const dns = require('dns');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const mongoose = require('mongoose');
const User = require('./models/User');
const Loan = require('./models/Loan');
const Customer = require('./models/Customer');
const Collection = require('./models/Collection');

async function initDb() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dd_finserve';
  await mongoose.connect(mongoUri, { dbName: 'dd_finserve' });
  console.log('Connected to MongoDB for DB initialization...');

  // 1. Ensure User collection exists and has users
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    await User.create([
      {
        email: 'admin@ddfinserve.com',
        password: 'admin123',
        name: 'Vaibhav Bodara',
        role: 'Branch Manager & Administrator',
        branch: 'Surat Main Branch',
        employeeId: 'DDF-MGR-001',
        phone: '+91 98765 43210',
        avatarColor: '#2563eb',
        status: 'Online',
        dailyTarget: 50000,
      },
      {
        email: 'officer@ddfinserve.com',
        password: 'officer123',
        name: 'Priya Sharma',
        role: 'Senior Loan Officer',
        branch: 'Surat Main Branch',
        employeeId: 'DDF-LO-002',
        phone: '+91 98765 43211',
        avatarColor: '#10b981',
        status: 'Online',
        dailyTarget: 40000,
      },
      {
        email: 'agent@ddfinserve.com',
        password: 'agent123',
        name: 'Agent Rahul',
        role: 'Field Collection Agent',
        branch: 'Surat Main Branch',
        employeeId: 'DDF-FCA-003',
        phone: '+91 98765 43212',
        avatarColor: '#f59e0b',
        status: 'On Field',
        dailyTarget: 25000,
      },
    ]);
    console.log('✅ Created User table & seeded initial staff users in MongoDB');
  } else {
    console.log(`ℹ️ User table already has ${userCount} users`);
  }

  // 2. Fix remainingBalance for completed loans
  const completedResult = await Loan.updateMany(
    { status: 'Completed', remainingBalance: { $gt: 0 } },
    { $set: { remainingBalance: 0 } }
  );
  if (completedResult.modifiedCount > 0) {
    console.log(`✅ Fixed remaining balance for ${completedResult.modifiedCount} completed loan(s)`);
  }

  // 3. Ensure Collection collection exists and has records for historical paid EMIs
  const colCount = await Collection.countDocuments();
  if (colCount === 0) {
    const loans = await Loan.find({ totalPaid: { $gt: 0 } }).populate('customer');
    let insertedCount = 0;
    for (const loan of loans) {
      if (!loan.customer) continue;
      const emiAmt = loan.dailyEMI || loan.emiAmount || 100;
      const paidCount = loan.paidEMI || Math.floor(loan.totalPaid / emiAmt);
      for (let i = 1; i <= paidCount; i++) {
        const daysAgo = paidCount - i;
        const pDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
        await Collection.create({
          loan: loan._id,
          customer: loan.customer._id,
          amountPaid: emiAmt,
          paymentDate: pDate,
          paymentMode: i % 3 === 0 ? 'UPI' : 'Cash',
          collectedBy: loan.collectorName || 'Agent Rahul',
          routeArea: loan.customer.routeArea || 'General',
          transactionRef: i % 3 === 0 ? `UPI/${Date.now().toString().slice(-6)}${i}` : '',
          notes: `Installment ${i} payment`,
        });
        insertedCount++;
      }
    }
    console.log(`✅ Created Collection table & seeded ${insertedCount} transactions in MongoDB`);
  } else {
    console.log(`ℹ️ Collection table already has ${colCount} collection records`);
  }

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('🎉 MongoDB tables active:', collections.map((c) => c.name));
  await mongoose.disconnect();
}

module.exports = initDb;

if (require.main === module) {
  initDb()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Initialization error:', err);
      process.exit(1);
    });
}
