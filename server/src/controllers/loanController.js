const Loan = require('../models/Loan');
const Customer = require('../models/Customer');
const Collection = require('../models/Collection');

// @desc    Get all loans
// @route   GET /api/loans
exports.getLoans = async (req, res) => {
  try {
    const { status, customerId, routeArea, search } = req.query;
    const query = {};

    if (status) query.status = status;
    if (customerId) query.customer = customerId;
    if (routeArea) query.routeArea = { $regex: routeArea, $options: 'i' };

    let loans = await Loan.find(query)
      .populate('customer', 'name phone customerId routeArea address')
      .sort({ createdAt: -1 });

    if (search) {
      const term = search.toLowerCase();
      loans = loans.filter(
        (l) =>
          l.loanNumber.toLowerCase().includes(term) ||
          (l.customer && l.customer.name.toLowerCase().includes(term)) ||
          (l.customer && l.customer.phone.includes(term))
      );
    }

    res.json({ success: true, count: loans.length, data: loans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single loan by ID with its collection ledger
// @route   GET /api/loans/:id
exports.getLoanById = async (req, res) => {
  try {
    const loan = await Loan.findById(req.params.id).populate('customer');
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    const collections = await Collection.find({ loan: loan._id }).sort({ paymentDate: -1 });

    res.json({
      success: true,
      data: {
        ...loan.toObject(),
        collections,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Disburse / Create new loan
// @route   POST /api/loans
exports.createLoan = async (req, res) => {
  try {
    const {
      customerId,
      principalAmount,
      interestRate = 10,
      tenureDays = 100,
      emiType = 'Daily',
      startDate = new Date(),
      notes,
    } = req.body;

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Calculations
    const principal = Number(principalAmount);
    const rate = Number(interestRate);
    const tenure = Number(tenureDays);

    const interestAmount = Math.round((principal * rate) / 100);
    const totalAmount = principal + interestAmount;
    const emiAmount = Math.ceil(totalAmount / tenure);

    const loan = await Loan.create({
      customer: customer._id,
      loanAmount: principal,
      principalAmount: principal,
      interestRate: rate,
      interestAmount,
      totalAmount,
      tenureDays: tenure,
      totalEMI: tenure,
      emiType,
      emiAmount,
      dailyEMI: emiAmount,
      loanStartDate: new Date(startDate),
      startDate: new Date(startDate),
      status: 'Active',
      totalPaid: 0,
      remainingBalance: totalAmount,
      paidInstallments: 0,
      totalInstallments: tenure,
      routeArea: customer.routeArea,
      notes,
    });

    res.status(201).json({ success: true, data: loan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update loan status
// @route   PUT /api/loans/:id/status
exports.updateLoanStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const loan = await Loan.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate('customer');

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan not found' });
    }

    res.json({ success: true, data: loan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
