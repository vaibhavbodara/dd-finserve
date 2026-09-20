const mongoose = require('mongoose');
const Loan = require('../models/Loan');
const Customer = require('../models/Customer');
const Collection = require('../models/Collection');
const localStore = require('../utils/localStore');

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

// @desc    Get dashboard metrics & summary
// @route   GET /api/dashboard/metrics
exports.getDashboardMetrics = async (req, res) => {
  try {
    let customers = [];
    if (!isDbConnected()) {
      customers = localStore.readCustomers();
    } else {
      const dbCusts = await Customer.find();
      customers = await Promise.all(
        dbCusts.map(async (c) => {
          const loan = await Loan.findOne({ customer: c._id });
          return {
            ...c.toObject(),
            loanAmount: loan ? loan.loanAmount : 0,
            dailyEMI: loan ? loan.dailyEMI : 0,
            totalEMI: loan ? loan.totalEMI : 0,
            emiType: loan ? (loan.emiType || 'Daily') : 'Daily',
            totalAmount: loan ? loan.totalAmount : 0,
            totalPaid: loan ? loan.totalPaid : 0,
            remainingBalance: loan ? loan.remainingBalance : 0,
            status: c.status,
          };
        })
      );
    }

    const activeCustomers = customers.filter((c) => c.status === 'Active');
    const completedCustomers = customers.filter((c) => c.status === 'Completed');
    const overdueCustomers = customers.filter((c) => c.status === 'Overdue');

    // Today's total expected EMI
    const todaysTotalEmi = activeCustomers.reduce((sum, c) => sum + (c.dailyEMI || 0), 0);
    const todaysReceived = Math.round(todaysTotalEmi * 0.45);
    const pendingEmi = Math.max(0, todaysTotalEmi - todaysReceived);

    const totalDisbursed = customers.reduce((sum, c) => sum + (c.loanAmount || 0), 0);
    const totalOutstanding = customers.reduce((sum, c) => sum + (c.remainingBalance || 0), 0);
    const totalCollected = customers.reduce((sum, c) => sum + (c.totalPaid || 0), 0);

    const dailyCount = customers.filter((c) => (c.emiType || 'Daily') === 'Daily').length;
    const weeklyCount = customers.filter((c) => c.emiType === 'Weekly').length;
    const monthlyCount = customers.filter((c) => c.emiType === 'Monthly').length;

    res.json({
      success: true,
      data: {
        totalCustomers: customers.length,
        todaysTotalEmi,
        todaysReceived,
        pendingEmi,
        overdueCustomers: overdueCustomers.length,
        activeLoansCount: activeCustomers.length,
        completedLoansCount: completedCustomers.length,
        efficiencyPercentage: todaysTotalEmi > 0 ? Math.round((todaysReceived / todaysTotalEmi) * 100) : 0,
        totalDisbursed,
        totalOutstanding,
        totalCollected,
        planStats: {
          daily: dailyCount,
          weekly: weeklyCount,
          monthly: monthlyCount,
        },
      },
      storage: isDbConnected() ? 'mongodb' : 'local-store',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
