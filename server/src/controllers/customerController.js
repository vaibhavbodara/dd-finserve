const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Loan = require('../models/Loan');
const Collection = require('../models/Collection');

// @desc    Get all customers with integrated loan details directly from MongoDB
// @route   GET /api/customers
exports.getCustomers = async (req, res) => {
  try {
    const { search, status, collectorName, emiType } = req.query;

    const query = {};
    if (status && status !== 'All') {
      query.status = status;
    }
    if (collectorName && collectorName !== 'All') {
      query.collectorName = { $regex: collectorName, $options: 'i' };
    }
    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { mobileNumber: { $regex: term, $options: 'i' } },
        { customerId: { $regex: term, $options: 'i' } },
        { address: { $regex: term, $options: 'i' } },
        { collectorName: { $regex: term, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(query).sort({ createdAt: -1 });

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
          routeArea: c.routeArea,
          notes: c.notes,
          loanId: loan ? loan._id : null,
          loanNumber: loan ? loan.loanNumber : '',
          loanAmount: loan ? (loan.loanAmount || loan.principalAmount || 0) : 0,
          interestRate: loan ? (loan.interestRate || 0) : 0,
          emiType: loan ? (loan.emiType || 'Daily') : 'Daily',
          emiAmount: loan ? (loan.emiAmount || loan.dailyEMI || 0) : 0,
          dailyEMI: loan ? (loan.dailyEMI || loan.emiAmount || 0) : 0,
          totalEMI: loan ? (loan.totalEMI || loan.totalInstallments || 0) : 0,
          paidEMI: loan ? (loan.paidEMI || loan.paidInstallments || 0) : 0,
          remainingBalance: loan
            ? (loan.remainingBalance !== undefined ? loan.remainingBalance : Math.max(0, (loan.totalAmount || 0) - (loan.totalPaid || 0)))
            : 0,
          totalAmount: loan ? (loan.totalAmount || 0) : 0,
          totalPaid: loan ? (loan.totalPaid || 0) : 0,
          loanStartDate: loan ? (loan.loanStartDate || loan.startDate) : null,
          loanEndDate: loan ? loan.loanEndDate : null,
          paymentRecords: loan ? (loan.paymentRecords || []) : [],
        };
      })
    );

    let filtered = customersWithLoans;
    if (emiType && emiType !== 'All') {
      filtered = filtered.filter((c) => (c.emiType || 'Daily') === emiType);
    }

    res.json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single customer by ID directly from MongoDB
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

// @desc    Customer Entry: Create Customer + Loan simultaneously in MongoDB
// @route   POST /api/customers
exports.createCustomer = async (req, res) => {
  try {
    const {
      customerId,
      name,
      mobileNumber,
      address,
      loanAmount,
      totalAmount,
      interestRate = 0,
      emiType = 'Daily',
      dailyEMI,
      emiAmount,
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

    // Check duplicate mobile in MongoDB
    const existing = await Customer.findOne({ mobileNumber });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Customer with mobile number ${mobileNumber} already exists (${existing.name} - ${existing.customerId})`,
      });
    }

    const lAmount = Number(loanAmount) || 0;
    const inputEMI = Number(emiAmount) || Number(dailyEMI) || 0;
    const tEMI = Number(totalEMI) || (emiType === 'Weekly' ? 12 : emiType === 'Monthly' ? 6 : 100);
    const inputTotal = Number(totalAmount) || 0;
    const calculatedTotalAmount = inputTotal > 0 ? inputTotal : inputEMI > 0 ? inputEMI * tEMI : lAmount;
    const calculatedEMI = inputEMI > 0 ? inputEMI : Math.ceil(calculatedTotalAmount / tEMI);

    const startDateObj = loanStartDate ? new Date(loanStartDate) : new Date();
    let endDateObj = loanEndDate ? new Date(loanEndDate) : null;
    if (!endDateObj) {
      endDateObj = new Date(startDateObj);
      if (emiType === 'Weekly') {
        endDateObj.setDate(endDateObj.getDate() + tEMI * 7);
      } else if (emiType === 'Monthly') {
        endDateObj.setMonth(endDateObj.getMonth() + tEMI);
      } else {
        endDateObj.setDate(endDateObj.getDate() + tEMI);
      }
    }

    // Create Customer in MongoDB
    const customerData = {
      name: name.trim(),
      mobileNumber: mobileNumber.trim(),
      address: address.trim(),
      collectorName: collectorName || 'Agent Rahul',
      kycDocument: kycDocument || { fileName: '', fileType: '', fileData: '' },
      status: status || 'Active',
      notes,
    };

    if (customerId && customerId.trim()) {
      customerData.customerId = customerId.trim();
    }

    const customer = await Customer.create(customerData);

    let loan = null;
    if (lAmount > 0) {
      loan = await Loan.create({
        customer: customer._id,
        loanAmount: lAmount,
        interestRate: Number(interestRate) || 0,
        emiType: emiType || 'Daily',
        emiAmount: calculatedEMI,
        dailyEMI: calculatedEMI,
        totalEMI: tEMI,
        paidEMI: 0,
        totalAmount: calculatedTotalAmount,
        totalPaid: 0,
        remainingBalance: calculatedTotalAmount,
        loanStartDate: startDateObj,
        loanEndDate: endDateObj,
        collectorName: collectorName || 'Agent Rahul',
        status: status || 'Active',
        notes,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Customer and Loan Entry created successfully in database',
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
        emiType: loan ? loan.emiType : emiType || 'Daily',
        emiAmount: loan ? loan.emiAmount : inputEMI,
        dailyEMI: loan ? loan.dailyEMI : inputEMI,
        totalEMI: loan ? loan.totalEMI : tEMI,
        paidEMI: 0,
        remainingBalance: loan ? loan.remainingBalance : 0,
        totalAmount: loan ? loan.totalAmount : calculatedTotalAmount,
        totalPaid: 0,
        loanStartDate: loan ? loan.loanStartDate : null,
        loanEndDate: loan ? loan.loanEndDate : null,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update customer & loan entry in MongoDB
// @route   PUT /api/customers/:id
exports.updateCustomer = async (req, res) => {
  try {
    const {
      name,
      mobileNumber,
      address,
      loanAmount,
      totalAmount,
      interestRate,
      emiType,
      dailyEMI,
      emiAmount,
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

    if (name) customer.name = name.trim();
    if (mobileNumber) customer.mobileNumber = mobileNumber.trim();
    if (address) customer.address = address.trim();
    if (collectorName) customer.collectorName = collectorName;
    if (kycDocument) customer.kycDocument = kycDocument;
    if (status) customer.status = status;
    if (notes !== undefined) customer.notes = notes;

    await customer.save();

    let loan = await Loan.findOne({ customer: customer._id });
    if (loan) {
      if (emiType) loan.emiType = emiType;
      if (loanAmount !== undefined) loan.loanAmount = Number(loanAmount);
      if (emiAmount !== undefined) {
        loan.emiAmount = Number(emiAmount);
        loan.dailyEMI = Number(emiAmount);
      } else if (dailyEMI !== undefined) {
        loan.dailyEMI = Number(dailyEMI);
        loan.emiAmount = Number(dailyEMI);
      }
      if (totalEMI !== undefined) loan.totalEMI = Number(totalEMI);
      if (loanStartDate) loan.loanStartDate = new Date(loanStartDate);
      if (loanEndDate) {
        loan.loanEndDate = new Date(loanEndDate);
      } else if (loanStartDate || totalEMI !== undefined || emiType) {
        const start = new Date(loan.loanStartDate);
        if (loan.emiType === 'Weekly') {
          start.setDate(start.getDate() + loan.totalEMI * 7);
        } else if (loan.emiType === 'Monthly') {
          start.setMonth(start.getMonth() + loan.totalEMI);
        } else {
          start.setDate(start.getDate() + loan.totalEMI);
        }
        loan.loanEndDate = start;
      }
      if (collectorName) loan.collectorName = collectorName;
      if (status) loan.status = status;
      if (interestRate !== undefined) loan.interestRate = Number(interestRate);
      if (totalAmount !== undefined && Number(totalAmount) > 0) {
        loan.totalAmount = Number(totalAmount);
        loan.remainingBalance = Math.max(0, loan.totalAmount - (loan.totalPaid || 0));
      } else if (loan.dailyEMI && loan.totalEMI) {
        loan.totalAmount = loan.dailyEMI * loan.totalEMI;
        loan.remainingBalance = Math.max(0, loan.totalAmount - (loan.totalPaid || 0));
      }

      if (req.body.paidEMI !== undefined) loan.paidEMI = Number(req.body.paidEMI);
      if (req.body.totalPaid !== undefined) loan.totalPaid = Number(req.body.totalPaid);
      if (req.body.remainingBalance !== undefined) loan.remainingBalance = Number(req.body.remainingBalance);
      if (req.body.paymentRecords !== undefined) loan.paymentRecords = req.body.paymentRecords;
      await loan.save();
    }

    res.json({
      success: true,
      message: 'Customer updated in database successfully',
      data: {
        ...customer.toObject(),
        loanId: loan ? loan._id : null,
        loanAmount: loan ? loan.loanAmount : 0,
        emiType: loan ? loan.emiType : emiType || 'Daily',
        emiAmount: loan ? loan.emiAmount : 0,
        dailyEMI: loan ? loan.dailyEMI : 0,
        totalEMI: loan ? loan.totalEMI : 0,
        paidEMI: loan ? loan.paidEMI : 0,
        remainingBalance: loan ? loan.remainingBalance : 0,
        totalAmount: loan ? loan.totalAmount : 0,
        totalPaid: loan ? loan.totalPaid : 0,
        loanStartDate: loan ? loan.loanStartDate : null,
        loanEndDate: loan ? loan.loanEndDate : null,
        loan,
      },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete customer and associated loan & collections in MongoDB
// @route   DELETE /api/customers/:id
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    await Collection.deleteMany({ customer: customer._id });
    await Loan.deleteMany({ customer: customer._id });
    await customer.deleteOne();

    res.json({ success: true, message: 'Customer, loans, and collections deleted from database successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
