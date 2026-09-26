const Loan = require('../models/Loan');
const Customer = require('../models/Customer');
const Collection = require('../models/Collection');

// @desc    Get dashboard metrics & summary
// @route   GET /api/dashboard/metrics
exports.getDashboardMetrics = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Active loans
    const activeLoans = await Loan.find({ status: 'Active' });
    const totalCustomers = await Customer.countDocuments();
    const completedLoansCount = await Loan.countDocuments({ status: 'Completed' });

    // Today's collections
    const todayCollections = await Collection.find({
      paymentDate: { $gte: startOfDay, $lte: endOfDay },
    });

    const todayCollectedAmount = todayCollections.reduce((sum, c) => sum + c.amountPaid, 0);
    const todayExpectedAmount = activeLoans.reduce((sum, l) => sum + l.dailyEMI, 0);

    // Unique loans paid today
    const paidLoanIdsToday = new Set(todayCollections.map((c) => c.loan.toString()));
    const todayPaidBorrowersCount = paidLoanIdsToday.size;
    const todayPendingBorrowersCount = Math.max(0, activeLoans.length - todayPaidBorrowersCount);

    // Portfolio metrics
    const totalPrincipalDisbursed = activeLoans.reduce((sum, l) => sum + l.principalAmount, 0);
    const totalPortfolioOutstanding = activeLoans.reduce((sum, l) => sum + l.remainingBalance, 0);
    const totalCollectedOverall = activeLoans.reduce((sum, l) => sum + l.totalPaid, 0);

    // Recent 8 collections
    const recentCollections = await Collection.find()
      .populate('customer', 'name phone customerId routeArea')
      .populate('loan', 'loanNumber dailyEMI')
      .sort({ createdAt: -1 })
      .limit(8);

    // Route-wise grouping
    const routesMap = {};
    activeLoans.forEach((loan) => {
      const route = loan.routeArea || 'General';
      if (!routesMap[route]) {
        routesMap[route] = {
          route,
          borrowersCount: 0,
          expectedAmount: 0,
          collectedAmount: 0,
        };
      }
      routesMap[route].borrowersCount += 1;
      routesMap[route].expectedAmount += loan.dailyEMI;
    });

    todayCollections.forEach((c) => {
      const route = c.routeArea || 'General';
      if (routesMap[route]) {
        routesMap[route].collectedAmount += c.amountPaid;
      }
    });

    const routeStats = Object.values(routesMap).map((r) => ({
      ...r,
      efficiencyPercentage: r.expectedAmount > 0 ? Math.round((r.collectedAmount / r.expectedAmount) * 100) : 0,
    }));

    res.json({
      success: true,
      data: {
        today: {
          expectedAmount: todayExpectedAmount,
          collectedAmount: todayCollectedAmount,
          pendingAmount: Math.max(0, todayExpectedAmount - todayCollectedAmount),
          paidBorrowersCount: todayPaidBorrowersCount,
          pendingBorrowersCount: todayPendingBorrowersCount,
          efficiencyPercentage:
            todayExpectedAmount > 0 ? Math.round((todayCollectedAmount / todayExpectedAmount) * 100) : 0,
        },
        portfolio: {
          totalCustomers,
          activeLoansCount: activeLoans.length,
          completedLoansCount,
          totalPrincipalDisbursed,
          totalPortfolioOutstanding,
          totalCollectedOverall,
        },
        routeStats,
        recentCollections,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
