const Loan = require('../models/Loan');
const Customer = require('../models/Customer');
const Collection = require('../models/Collection');

// @desc    Get dashboard metrics & summary directly from MongoDB
// @route   GET /api/dashboard/metrics
exports.getDashboardMetrics = async (req, res) => {
  try {
    const customers = await Customer.find();
    const loans = await Loan.find();

    const activeCustomers = customers.filter((c) => c.status === 'Active');
    const completedCustomers = customers.filter((c) => c.status === 'Completed');
    const overdueCustomers = customers.filter((c) => c.status === 'Overdue');

    // Expected daily EMI from all active loans
    const activeLoans = loans.filter((l) => l.status === 'Active');
    const todaysTotalEmi = activeLoans.reduce((sum, l) => sum + (l.dailyEMI || l.emiAmount || 0), 0);

    // Actual payments collected today directly from MongoDB Collection records
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const todayCollections = await Collection.find({
      paymentDate: { $gte: startOfDay, $lte: endOfDay },
    });

    const todaysReceived = todayCollections.reduce((sum, c) => sum + (c.amountPaid || 0), 0);
    const pendingEmi = Math.max(0, todaysTotalEmi - todaysReceived);

    const totalDisbursed = loans.reduce((sum, l) => sum + (l.loanAmount || l.principalAmount || 0), 0);
    const totalCollected = loans.reduce((sum, l) => sum + (l.totalPaid || 0), 0);
    const totalOutstanding = loans.reduce((sum, l) => sum + (l.remainingBalance || 0), 0);

    const dailyCount = loans.filter((l) => (l.emiType || 'Daily') === 'Daily').length;
    const weeklyCount = loans.filter((l) => l.emiType === 'Weekly').length;
    const monthlyCount = loans.filter((l) => l.emiType === 'Monthly').length;

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
      storage: 'mongodb',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
