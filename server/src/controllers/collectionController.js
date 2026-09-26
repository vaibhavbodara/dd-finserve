const Collection = require('../models/Collection');
const Loan = require('../models/Loan');

// @desc    Record daily EMI collection
// @route   POST /api/collections
exports.recordCollection = async (req, res) => {
  try {
    const { loanId, amountPaid, paymentMode = 'Cash', collectedBy = 'Field Agent', transactionRef, notes } = req.body;

    const loan = await Loan.findById(loanId).populate('customer');
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    if (loan.status !== 'Active') {
      return res.status(400).json({ success: false, message: `Cannot collect on a loan with status '${loan.status}'` });
    }

    const amount = Number(amountPaid);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    // Create collection record
    const collection = await Collection.create({
      loan: loan._id,
      customer: loan.customer._id,
      amountPaid: amount,
      paymentMode,
      collectedBy,
      routeArea: loan.routeArea,
      transactionRef,
      notes,
    });

    // Update loan totals
    loan.totalPaid += amount;
    loan.remainingBalance = Math.max(0, loan.totalAmount - loan.totalPaid);
    loan.paidInstallments = Math.floor(loan.totalPaid / loan.dailyEMI);

    if (loan.remainingBalance <= 0) {
      loan.status = 'Completed';
    }

    await loan.save();

    res.status(201).json({
      success: true,
      message: 'Collection recorded successfully',
      data: {
        collection,
        updatedLoan: {
          loanNumber: loan.loanNumber,
          remainingBalance: loan.remainingBalance,
          totalPaid: loan.totalPaid,
          status: loan.status,
          paidInstallments: loan.paidInstallments,
          totalInstallments: loan.totalInstallments,
        },
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get Today's Daily Collection Sheet (Route-wise)
// @route   GET /api/collections/today-sheet
exports.getTodayCollectionSheet = async (req, res) => {
  try {
    const { routeArea } = req.query;
    const loanQuery = { status: 'Active' };

    if (routeArea) {
      loanQuery.routeArea = { $regex: routeArea, $options: 'i' };
    }

    const activeLoans = await Loan.find(loanQuery)
      .populate('customer', 'name phone customerId routeArea address')
      .sort({ routeArea: 1, createdAt: 1 });

    // Determine start and end of today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Get all collections made today
    const todayCollections = await Collection.find({
      paymentDate: { $gte: startOfDay, $lte: endOfDay },
    });

    // Map each active loan with today's status
    const sheet = activeLoans.map((loan) => {
      const paymentsToday = todayCollections.filter((c) => c.loan.toString() === loan._id.toString());
      const collectedToday = paymentsToday.reduce((sum, c) => sum + c.amountPaid, 0);
      const isPaidToday = collectedToday >= loan.dailyEMI;

      return {
        loanId: loan._id,
        loanNumber: loan.loanNumber,
        customer: loan.customer,
        routeArea: loan.routeArea,
        dailyEMI: loan.dailyEMI,
        totalAmount: loan.totalAmount,
        totalPaid: loan.totalPaid,
        remainingBalance: loan.remainingBalance,
        paidInstallments: loan.paidInstallments,
        totalInstallments: loan.totalInstallments,
        collectedToday,
        isPaidToday,
        lastCollection: paymentsToday[paymentsToday.length - 1] || null,
      };
    });

    // Summary totals for today's sheet
    const totalExpectedToday = sheet.reduce((sum, item) => sum + item.dailyEMI, 0);
    const totalCollectedToday = sheet.reduce((sum, item) => sum + item.collectedToday, 0);
    const paidCount = sheet.filter((item) => item.isPaidToday).length;
    const pendingCount = sheet.length - paidCount;

    res.json({
      success: true,
      summary: {
        totalBorrowers: sheet.length,
        totalExpectedToday,
        totalCollectedToday,
        paidCount,
        pendingCount,
        collectionPercentage: totalExpectedToday > 0 ? Math.round((totalCollectedToday / totalExpectedToday) * 100) : 0,
      },
      data: sheet,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get collection history / transactions
// @route   GET /api/collections
exports.getCollections = async (req, res) => {
  try {
    const { loanId, customerId, startDate, endDate, routeArea, limit = 50 } = req.query;
    const query = {};

    if (loanId) query.loan = loanId;
    if (customerId) query.customer = customerId;
    if (routeArea) query.routeArea = { $regex: routeArea, $options: 'i' };

    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.paymentDate.$lte = end;
      }
    }

    const collections = await Collection.find(query)
      .populate('customer', 'name phone customerId routeArea')
      .populate('loan', 'loanNumber dailyEMI remainingBalance')
      .sort({ paymentDate: -1 })
      .limit(Number(limit));

    res.json({ success: true, count: collections.length, data: collections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single receipt by ID
// @route   GET /api/collections/receipt/:id
exports.getReceipt = async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate('customer')
      .populate('loan');

    if (!collection) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    res.json({ success: true, data: collection });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
