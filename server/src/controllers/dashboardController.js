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

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalOverduePenalties = 0;
    let computedOverdueCustomerCount = 0;

    for (const loan of loans) {
      if (loan.status === 'Completed' || (loan.remainingBalance !== undefined && loan.remainingBalance <= 0)) continue;
      const totalEMI = loan.totalEMI || 100;
      const paidEMI = loan.paidEMI || 0;
      const startDate = loan.loanStartDate ? new Date(loan.loanStartDate) : null;
      if (!startDate) continue;
      startDate.setHours(0, 0, 0, 0);

      let loanOverdueCount = 0;
      if (Array.isArray(loan.paymentRecords) && loan.paymentRecords.length > 0) {
        for (const rec of loan.paymentRecords) {
          if (rec.status === 'Paid') continue;
          const rDate = new Date(rec.scheduledDate);
          rDate.setHours(0, 0, 0, 0);
          if (rDate < today || rec.status === 'Overdue') {
            loanOverdueCount++;
          }
        }
      } else {
        for (let i = 1; i <= totalEMI; i++) {
          const dueDate = new Date(startDate);
          if (loan.emiType === 'Weekly') {
            dueDate.setDate(dueDate.getDate() + i * 7);
          } else if (loan.emiType === 'Monthly') {
            dueDate.setMonth(dueDate.getMonth() + i);
          } else {
            dueDate.setDate(dueDate.getDate() + i);
          }
          dueDate.setHours(0, 0, 0, 0);

          if (i > paidEMI && dueDate < today) {
            loanOverdueCount++;
          }
        }
      }

      if (loanOverdueCount > 0) {
        computedOverdueCustomerCount++;
        totalOverduePenalties += loanOverdueCount * (loan.penaltyPerDay || 200);
      }
    }

    const finalOverdueCount = Math.max(overdueCustomers.length, computedOverdueCustomerCount);

    res.json({
      success: true,
      data: {
        totalCustomers: customers.length,
        todaysTotalEmi,
        todaysReceived,
        pendingEmi,
        overdueCustomers: finalOverdueCount,
        totalOverduePenalties,
        penaltyPerDay: 200,
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
