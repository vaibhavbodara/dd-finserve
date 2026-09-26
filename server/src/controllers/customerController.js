const Customer = require('../models/Customer');
const Loan = require('../models/Loan');

// @desc    Get all customers with integrated loan details for table
// @route   GET /api/customers
exports.getCustomers = async (req, res) => {
  try {
    const { search, status, collectorName } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    }

    if (collectorName) {
      query.collectorName = { $regex: collectorName, $options: 'i' };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobileNumber: { $regex: search, $options: 'i' } },
        { customerId: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { collectorName: { $regex: search, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 });

    // Join with loan information for each customer
    const customersWithLoans = await Promise.all(
      customers.map(async (c) => {
        const loan = await Loan.findOne({ customer: c._id }).sort({ createdAt: -1 });
        return {
          _id: c._id,
          customerId: c.customerId,
          name: c.name,
          mobileNumber: c.mobileNumber,
          address: c.address,
          collectorName: c.collectorName,
          kycDocument: c.kycDocument,
          status: c.status,
          createdAt: c.createdAt,
          // Loan fields (if existing)
          loanId: loan ? loan._id : null,
          loanNumber: loan ? loan.loanNumber : '',
          loanAmount: loan ? loan.loanAmount : 0,
          dailyEMI: loan ? loan.dailyEMI : 0,
          totalEMI: loan ? loan.totalEMI : 0,
          paidEMI: loan ? loan.paidEMI : 0,
          remainingBalance: loan ? loan.remainingBalance : 0,
          totalAmount: loan ? loan.totalAmount : 0,
          totalPaid: loan ? loan.totalPaid : 0,
          loanStartDate: loan ? loan.loanStartDate : null,
          loanEndDate: loan ? loan.loanEndDate : null,
        };
      })
    );

    res.json({
      success: true,
      count: customersWithLoans.length,
      data: customersWithLoans,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single customer by ID
// @route   GET /api/customers/:id
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const loan = await Loan.findOne({ customer: customer._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        ...customer.toObject(),
        loan,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Customer Entry: Create Customer + Loan simultaneously
// @route   POST /api/customers
exports.createCustomer = async (req, res) => {
  try {
    const {
      customerId,
      name,
      mobileNumber,
      address,
      loanAmount,
      dailyEMI,
      totalEMI,
      loanStartDate,
      loanEndDate,
      collectorName,
      kycDocument,
      status = 'Active',
      notes,
    } = req.body;

    if (!name || !mobileNumber || !address) {
      return res.status(400).json({
        success: false,
        message: 'Name, Mobile Number, and Address are required fields',
      });
    }

    // Check duplicate mobile
    const existing = await Customer.findOne({ mobileNumber });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Customer with mobile number ${mobileNumber} already exists (${existing.name} - ${existing.customerId})`,
      });
    }

    // Create Customer
    const customerData = {
      name,
      mobileNumber,
      address,
      collectorName: collectorName || 'Agent 1',
      kycDocument: kycDocument || { fileName: '', fileType: '', fileData: '' },
      status: status || 'Active',
      notes,
    };

    if (customerId && customerId.trim()) {
      customerData.customerId = customerId.trim();
    }

    const customer = await Customer.create(customerData);

    // Create Associated Loan if loan details provided
    let loan = null;
    const lAmount = Number(loanAmount) || 0;
    const dEMI = Number(dailyEMI) || 0;
    const tEMI = Number(totalEMI) || 100;

    if (lAmount > 0) {
      const calculatedTotalAmount = dEMI > 0 ? dEMI * tEMI : lAmount;
      const calculatedDailyEMI = dEMI > 0 ? dEMI : Math.ceil(lAmount / tEMI);

      const startDateObj = loanStartDate ? new Date(loanStartDate) : new Date();
      let endDateObj = loanEndDate ? new Date(loanEndDate) : null;
      if (!endDateObj) {
        endDateObj = new Date(startDateObj);
        endDateObj.setDate(endDateObj.getDate() + tEMI);
      }

      loan = await Loan.create({
        customer: customer._id,
        loanAmount: lAmount,
        dailyEMI: calculatedDailyEMI,
        totalEMI: tEMI,
        paidEMI: 0,
        totalAmount: calculatedTotalAmount,
        totalPaid: 0,
        remainingBalance: calculatedTotalAmount,
        loanStartDate: startDateObj,
        loanEndDate: endDateObj,
        collectorName: collectorName || 'Agent 1',
        status: status || 'Active',
        notes,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Customer and Loan Entry created successfully',
      data: {
        _id: customer._id,
        customerId: customer.customerId,
        name: customer.name,
        mobileNumber: customer.mobileNumber,
        address: customer.address,
        collectorName: customer.collectorName,
        kycDocument: customer.kycDocument,
        status: customer.status,
        loanAmount: loan ? loan.loanAmount : 0,
        dailyEMI: loan ? loan.dailyEMI : 0,
        totalEMI: loan ? loan.totalEMI : 0,
        paidEMI: 0,
        loanStartDate: loan ? loan.loanStartDate : null,
        loanEndDate: loan ? loan.loanEndDate : null,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update customer & loan entry
// @route   PUT /api/customers/:id
exports.updateCustomer = async (req, res) => {
  try {
    const {
      name,
      mobileNumber,
      address,
      loanAmount,
      dailyEMI,
      totalEMI,
      loanStartDate,
      loanEndDate,
      collectorName,
      kycDocument,
      status,
      notes,
    } = req.body;

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (name) customer.name = name;
    if (mobileNumber) customer.mobileNumber = mobileNumber;
    if (address) customer.address = address;
    if (collectorName) customer.collectorName = collectorName;
    if (kycDocument) customer.kycDocument = kycDocument;
    if (status) customer.status = status;
    if (notes !== undefined) customer.notes = notes;

    await customer.save();

    // Update associated loan
    let loan = await Loan.findOne({ customer: customer._id });
    if (loan) {
      if (loanAmount !== undefined) loan.loanAmount = Number(loanAmount);
      if (dailyEMI !== undefined) loan.dailyEMI = Number(dailyEMI);
      if (totalEMI !== undefined) loan.totalEMI = Number(totalEMI);
      if (loanStartDate) loan.loanStartDate = new Date(loanStartDate);
      if (loanEndDate) loan.loanEndDate = new Date(loanEndDate);
      if (collectorName) loan.collectorName = collectorName;
      if (status) loan.status = status;
      if (loan.dailyEMI && loan.totalEMI) {
        loan.totalAmount = loan.dailyEMI * loan.totalEMI;
        loan.remainingBalance = Math.max(0, loan.totalAmount - (loan.totalPaid || 0));
      }
      await loan.save();
    }

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: {
        ...customer.toObject(),
        loan,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete customer and associated loan
// @route   DELETE /api/customers/:id
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    await Loan.deleteMany({ customer: customer._id });
    await customer.deleteOne();

    res.json({ success: true, message: 'Customer and loan entry deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
