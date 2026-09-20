const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../../data');
const dataFilePath = path.join(dataDir, 'customers.json');

const initialCustomers = [
  {
    _id: 'cust-1',
    customerId: 'CUST-1001',
    name: 'Rajesh Sharma',
    mobileNumber: '9876543210',
    address: 'Shop 12, Main Market, MG Road',
    loanAmount: 10000,
    emiType: 'Daily',
    dailyEMI: 110,
    emiAmount: 110,
    totalEMI: 100,
    paidEMI: 15,
    remainingBalance: 9350,
    totalAmount: 11000,
    totalPaid: 1650,
    loanStartDate: '2026-09-01T00:00:00.000Z',
    loanEndDate: '2026-12-10T00:00:00.000Z',
    collectorName: 'Agent Rahul',
    status: 'Active',
    kycDocument: {
      fileName: 'aadhaar_card_rajesh.pdf',
      fileType: 'application/pdf',
      fileData: '',
    },
    createdAt: new Date('2026-09-01').toISOString(),
  },
  {
    _id: 'cust-2',
    customerId: 'CUST-1002',
    name: 'Pooja Patil',
    mobileNumber: '9822345678',
    address: 'Flat 402, Shiv Krupa, Station Road',
    loanAmount: 20000,
    emiType: 'Weekly',
    dailyEMI: 1700,
    emiAmount: 1700,
    totalEMI: 12,
    paidEMI: 5,
    remainingBalance: 11900,
    totalAmount: 20400,
    totalPaid: 8500,
    loanStartDate: '2026-08-10T00:00:00.000Z',
    loanEndDate: '2026-11-02T00:00:00.000Z',
    collectorName: 'Agent Suresh',
    status: 'Active',
    kycDocument: {
      fileName: 'pan_card_pooja.jpg',
      fileType: 'image/jpeg',
      fileData: '',
    },
    createdAt: new Date('2026-08-10').toISOString(),
  },
  {
    _id: 'cust-3',
    customerId: 'CUST-1003',
    name: 'Mohammad Imran',
    mobileNumber: '9765432109',
    address: 'Gala 5, Industrial Estate',
    loanAmount: 15000,
    emiType: 'Daily',
    dailyEMI: 165,
    emiAmount: 165,
    totalEMI: 100,
    paidEMI: 100,
    remainingBalance: 0,
    totalAmount: 16500,
    totalPaid: 16500,
    loanStartDate: '2026-05-01T00:00:00.000Z',
    loanEndDate: '2026-08-09T00:00:00.000Z',
    collectorName: 'Agent Rahul',
    status: 'Completed',
    kycDocument: { fileName: '', fileType: '', fileData: '' },
    createdAt: new Date('2026-05-01').toISOString(),
  },
  {
    _id: 'cust-4',
    customerId: 'CUST-1004',
    name: 'Sunita Devi',
    mobileNumber: '9988776655',
    address: 'Plot 88, Gandhi Nagar, 3rd Cross',
    loanAmount: 12000,
    emiType: 'Monthly',
    dailyEMI: 2200,
    emiAmount: 2200,
    totalEMI: 6,
    paidEMI: 1,
    remainingBalance: 11000,
    totalAmount: 13200,
    totalPaid: 2200,
    loanStartDate: '2026-07-15T00:00:00.000Z',
    loanEndDate: '2027-01-15T00:00:00.000Z',
    collectorName: 'Agent Priya',
    status: 'Overdue',
    kycDocument: { fileName: '', fileType: '', fileData: '' },
    createdAt: new Date('2026-07-15').toISOString(),
  },
  {
    _id: 'cust-5',
    customerId: 'CUST-1005',
    name: 'Vikram Singh',
    mobileNumber: '9123456780',
    address: 'Shop 4, APMC Fruit Market',
    loanAmount: 25000,
    emiType: 'Daily',
    dailyEMI: 275,
    emiAmount: 275,
    totalEMI: 100,
    paidEMI: 30,
    remainingBalance: 19250,
    totalAmount: 27500,
    totalPaid: 8250,
    loanStartDate: '2026-08-25T00:00:00.000Z',
    loanEndDate: '2026-12-03T00:00:00.000Z',
    collectorName: 'Agent Rahul',
    status: 'Active',
    kycDocument: { fileName: '', fileType: '', fileData: '' },
    createdAt: new Date('2026-08-25').toISOString(),
  },
];

function ensureStorage() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify(initialCustomers, null, 2), 'utf-8');
  }
}

function readCustomers() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(dataFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading local customer store:', err.message);
    return [...initialCustomers];
  }
}

function writeCustomers(customers) {
  ensureStorage();
  fs.writeFileSync(dataFilePath, JSON.stringify(customers, null, 2), 'utf-8');
}

module.exports = {
  readCustomers,
  writeCustomers,
};
