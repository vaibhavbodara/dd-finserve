const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Customer = require('./models/Customer');
const Loan = require('./models/Loan');
const Collection = require('./models/Collection');
const path = require('path');
const dns = require('dns');

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const sampleCustomers = [
  {
    name: 'Rajesh Sharma',
    phone: '9876543210',
    email: 'rajesh.sharma@example.com',
    aadhaarNo: '1234-5678-9012',
    address: 'Shop 12, Main Market',
    routeArea: 'Main Bazaar',
    guarantorName: 'Amit Verma',
    guarantorPhone: '9876543211',
    status: 'Active',
  },
  {
    name: 'Pooja Patil',
    phone: '9876543212',
    email: 'pooja.patil@example.com',
    aadhaarNo: '2345-6789-0123',
    address: 'Flat 402, Shiv Krupa, Station Road',
    routeArea: 'Station Road',
    guarantorName: 'Suresh Patil',
    guarantorPhone: '9876543213',
    status: 'Active',
  },
  {
    name: 'Mohammad Imran',
    phone: '9876543214',
    email: 'imran.m@example.com',
    aadhaarNo: '3456-7890-1234',
    address: 'Gala 5, Industrial Estate',
    routeArea: 'Industrial Area',
    guarantorName: 'Farooq Shaikh',
    guarantorPhone: '9876543215',
    status: 'Active',
  },
  {
    name: 'Sunita Devi',
    phone: '9876543216',
    email: 'sunita.devi@example.com',
    aadhaarNo: '4567-8901-2345',
    address: 'Plot 88, Gandhi Nagar',
    routeArea: 'Gandhi Market',
    guarantorName: 'Rameshwar Kumar',
    guarantorPhone: '9876543217',
    status: 'Active',
  },
  {
    name: 'Vikram Singh',
    phone: '9876543218',
    email: 'vikram.singh@example.com',
    aadhaarNo: '5678-9012-3456',
    address: 'Shop 4, APMC Complex',
    routeArea: 'Main Bazaar',
    guarantorName: 'Dharmendra Singh',
    guarantorPhone: '9876543219',
    status: 'Active',
  },
];

async function seedData() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dd_finserve';
    await mongoose.connect(mongoUri);
    console.log(' Connected to MongoDB for seeding...');

    // Clear existing collections
    await Collection.deleteMany({});
    await Loan.deleteMany({});
    await Customer.deleteMany({});
    console.log(' Cleared old records...');

    // Insert Customers
    const createdCustomers = await Customer.create(sampleCustomers);
    console.log(` Created ${createdCustomers.length} sample customers.`);

    // Create Sample Loans (100-day Daily EMI)
    const loanConfigs = [
      { principal: 10000, rate: 10, tenure: 100 }, // Total: 11000, EMI: 110
      { principal: 20000, rate: 10, tenure: 100 }, // Total: 22000, EMI: 220
      { principal: 15000, rate: 10, tenure: 100 }, // Total: 16500, EMI: 165
      { principal: 30000, rate: 10, tenure: 100 }, // Total: 33000, EMI: 330
      { principal: 12000, rate: 10, tenure: 100 }, // Total: 13200, EMI: 132
    ];

    const createdLoans = [];
    for (let i = 0; i < createdCustomers.length; i++) {
      const cust = createdCustomers[i];
      const cfg = loanConfigs[i];
      const interestAmount = Math.round((cfg.principal * cfg.rate) / 100);
      const totalAmount = cfg.principal + interestAmount;
      const dailyEMI = Math.ceil(totalAmount / cfg.tenure);

      const loan = await Loan.create({
        customer: cust._id,
        principalAmount: cfg.principal,
        interestRate: cfg.rate,
        interestAmount,
        totalAmount,
        tenureDays: cfg.tenure,
        dailyEMI,
        startDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // started 15 days ago
        status: 'Active',
        totalPaid: 0,
        remainingBalance: totalAmount,
        paidInstallments: 0,
        totalInstallments: cfg.tenure,
        routeArea: cust.routeArea,
        notes: 'Micro business daily collection loan',
      });
      createdLoans.push(loan);
    }
    console.log(` Created ${createdLoans.length} sample loans.`);

    // Record sample past collections and 2 today collections
    for (let i = 0; i < createdLoans.length; i++) {
      const loan = createdLoans[i];
      // Past collections (10 days)
      for (let day = 1; day <= 10; day++) {
        const pastDate = new Date(Date.now() - (15 - day) * 24 * 60 * 60 * 1000);
        await Collection.create({
          loan: loan._id,
          customer: loan.customer,
          amountPaid: loan.dailyEMI,
          paymentDate: pastDate,
          paymentMode: 'Cash',
          collectedBy: 'Agent Rahul',
          routeArea: loan.routeArea,
          notes: `Day ${day} EMI collected`,
        });

        loan.totalPaid += loan.dailyEMI;
        loan.remainingBalance -= loan.dailyEMI;
        loan.paidInstallments += 1;
      }

      // Collect today for first 2 customers to show live progress
      if (i < 2) {
        await Collection.create({
          loan: loan._id,
          customer: loan.customer,
          amountPaid: loan.dailyEMI,
          paymentDate: new Date(),
          paymentMode: i === 0 ? 'UPI' : 'Cash',
          transactionRef: i === 0 ? 'UPI/2026/898231' : '',
          collectedBy: 'Agent Rahul',
          routeArea: loan.routeArea,
          notes: `Today's EMI received`,
        });

        loan.totalPaid += loan.dailyEMI;
        loan.remainingBalance -= loan.dailyEMI;
        loan.paidInstallments += 1;
      }

      await loan.save();
    }

    console.log(' Sample collections seeded successfully!');
    console.log('✅ Seeding complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seedData();
