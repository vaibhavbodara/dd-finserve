const mongoose = require('mongoose');
const Customer = require('../models/Customer');
const Loan = require('../models/Loan');
const localStore = require('../utils/localStore');

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

// @desc    Get all customers with integrated loan details for table
// @route   GET /api/customers
exports.getCustomers = async (req, res) => {
  try {
    const { search, status, collectorName, emiType } = req.query;

    // Fallback: If MongoDB is offline, serve from persistent localStore
    if (!isDbConnected()) {
      let list = localStore.readCustomers();

      if (status && status !== 'All') {
        list = list.filter((c) => c.status === status);
      }
      if (collectorName && collectorName !== 'All') {
        const col = collectorName.toLowerCase();
        list = list.filter((c) => (c.collectorName || '').toLowerCase().includes(col));
      }
      if (emiType && emiType !== 'All') {
        list = list.filter((c) => (c.emiType || 'Daily') === emiType);
      }
      if (search && search.trim()) {
        const s = search.trim().toLowerCase();
        list = list.filter(
          (c) =>
            (c.name && c.name.toLowerCase().includes(s)) ||
            (c.mobileNumber && c.mobileNumber.includes(s)) ||
            (c.customerId && c.customerId.toLowerCase().includes(s)) ||
            (c.address && c.address.toLowerCase().includes(s)) ||
            (c.collectorName && c.collectorName.toLowerCase().includes(s))
        );
      }

      return res.json({
        success: true,
        count: list.length,
        data: list,
        storage: 'local-store',
      });
    }

    // Live MongoDB Query
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
          loanId: loan ? loan._id : null,
          loanNumber: loan ? loan.loanNumber : '',
          loanAmount: loan ? loan.loanAmount : 0,
          interestRate: loan ? (loan.interestRate || 0) : 0,
          emiType: loan ? (loan.emiType || 'Daily') : 'Daily',
          emiAmount: loan ? (loan.emiAmount || loan.dailyEMI) : 0,
          dailyEMI: loan ? loan.dailyEMI : 0,
          totalEMI: loan ? loan.totalEMI : 0,
          paidEMI: loan ? loan.paidEMI : 0,
          remainingBalance: loan ? loan.remainingBalance : 0,
          totalAmount: loan ? loan.totalAmount : 0,
          totalPaid: loan ? loan.totalPaid : 0,
          loanStartDate: loan ? loan.loanStartDate : null,
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
      storage: 'mongodb',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single customer by ID
// @route   GET /api/customers/:id
exports.getCustomerById = async (req, res) => {
  try {
    if (!isDbConnected()) {
      const list = localStore.readCustomers();
      const customer = list.find((c) => c._id === req.params.id || c.customerId === req.params.id);
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }
      return res.json({ success: true, data: customer, storage: 'local-store' });
    }

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
      storage: 'mongodb',
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

    const lAmount = Number(loanAmount) || 0;
    const inputEMI = Number(emiAmount) || Number(dailyEMI) || 0;
    const tEMI = Number(totalEMI) || (emiType === 'Weekly' ? 12 : (emiType === 'Monthly' ? 6 : 100));
    const inputTotal = Number(totalAmount) || 0;
    const calculatedTotalAmount = inputTotal > 0 ? inputTotal : (inputEMI > 0 ? inputEMI * tEMI : lAmount);
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

    // Fallback: If MongoDB is offline, store in persistent localStore
    if (!isDbConnected()) {
      const list = localStore.readCustomers();
      const existing = list.find((c) => c.mobileNumber === mobileNumber);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `Customer with mobile number ${mobileNumber} already exists (${existing.name} - ${existing.customerId})`,
        });
      }

      const generatedId = customerId && customerId.trim() ? customerId.trim() : `CUST-${String(list.length + 1001).padStart(4, '0')}`;
      const newCustomer = {
        _id: 'cust-' + Date.now(),
        customerId: generatedId,
        name: name.trim(),
        mobileNumber: mobileNumber.trim(),
        address: address.trim(),
        collectorName: collectorName || 'Agent Rahul',
        kycDocument: kycDocument || { fileName: '', fileType: '', fileData: '' },
        status: status || 'Active',
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
        loanStartDate: startDateObj.toISOString(),
        loanEndDate: endDateObj.toISOString(),
        notes,
        createdAt: new Date().toISOString(),
      };

      list.unshift(newCustomer);
      localStore.writeCustomers(list);

      return res.status(201).json({
        success: true,
        message: 'Customer and Loan Entry created successfully (Persistent Storage)',
        data: newCustomer,
        storage: 'local-store',
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

    // Create Customer in MongoDB
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
        emiType: loan ? loan.emiType : (emiType || 'Daily'),
        emiAmount: loan ? loan.emiAmount : inputEMI,
        dailyEMI: loan ? loan.dailyEMI : inputEMI,
        totalEMI: loan ? loan.totalEMI : tEMI,
        paidEMI: 0,
        loanStartDate: loan ? loan.loanStartDate : null,
        loanEndDate: loan ? loan.loanEndDate : null,
      },
      storage: 'mongodb',
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

    // Fallback: If MongoDB is offline, update in persistent localStore
    if (!isDbConnected()) {
      const list = localStore.readCustomers();
      const idx = list.findIndex((c) => c._id === req.params.id || c.customerId === req.params.id);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      const current = list[idx];
      if (name) current.name = name.trim();
      if (mobileNumber) current.mobileNumber = mobileNumber.trim();
      if (address) current.address = address.trim();
      if (collectorName) current.collectorName = collectorName;
      if (kycDocument) current.kycDocument = kycDocument;
      if (status) current.status = status;
      if (notes !== undefined) current.notes = notes;
      if (emiType) current.emiType = emiType;
      if (interestRate !== undefined) current.interestRate = Number(interestRate);
      if (loanAmount !== undefined) current.loanAmount = Number(loanAmount);
      if (emiAmount !== undefined) {
        current.emiAmount = Number(emiAmount);
        current.dailyEMI = Number(emiAmount);
      } else if (dailyEMI !== undefined) {
        current.dailyEMI = Number(dailyEMI);
        current.emiAmount = Number(dailyEMI);
      }
      if (totalEMI !== undefined) current.totalEMI = Number(totalEMI);
      if (loanStartDate) current.loanStartDate = new Date(loanStartDate).toISOString();
      if (loanEndDate) {
        current.loanEndDate = new Date(loanEndDate).toISOString();
      } else if (loanStartDate || totalEMI !== undefined || emiType) {
        const start = new Date(current.loanStartDate || Date.now());
        if (current.emiType === 'Weekly') {
          start.setDate(start.getDate() + current.totalEMI * 7);
        } else if (current.emiType === 'Monthly') {
          start.setMonth(start.getMonth() + current.totalEMI);
        } else {
          start.setDate(start.getDate() + current.totalEMI);
        }
        current.loanEndDate = start.toISOString();
      }

      if (totalAmount !== undefined && Number(totalAmount) > 0) {
        current.totalAmount = Number(totalAmount);
        current.remainingBalance = Math.max(0, current.totalAmount - (current.totalPaid || 0));
      } else if (current.dailyEMI && current.totalEMI) {
        current.totalAmount = current.dailyEMI * current.totalEMI;
        current.remainingBalance = Math.max(0, current.totalAmount - (current.totalPaid || 0));
      }

      if (req.body.paidEMI !== undefined) current.paidEMI = Number(req.body.paidEMI);
      if (req.body.totalPaid !== undefined) current.totalPaid = Number(req.body.totalPaid);
      if (req.body.remainingBalance !== undefined) current.remainingBalance = Number(req.body.remainingBalance);
      if (req.body.paymentRecords !== undefined) current.paymentRecords = req.body.paymentRecords;

      list[idx] = current;
      localStore.writeCustomers(list);

      return res.json({
        success: true,
        message: 'Customer updated successfully',
        data: current,
        storage: 'local-store',
      });
    }

    // Live MongoDB Update
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
      message: 'Customer updated successfully',
      data: {
        ...customer.toObject(),
        loanId: loan ? loan._id : null,
        loanAmount: loan ? loan.loanAmount : 0,
        emiType: loan ? (loan.emiType || 'Daily') : 'Daily',
        emiAmount: loan ? (loan.emiAmount || loan.dailyEMI) : 0,
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
      storage: 'mongodb',
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete customer and associated loan
// @route   DELETE /api/customers/:id
exports.deleteCustomer = async (req, res) => {
  try {
    if (!isDbConnected()) {
      let list = localStore.readCustomers();
      const before = list.length;
      list = list.filter((c) => c._id !== req.params.id && c.customerId !== req.params.id);
      if (list.length === before) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }
      localStore.writeCustomers(list);
      return res.json({ success: true, message: 'Customer deleted successfully', storage: 'local-store' });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    await Loan.deleteMany({ customer: customer._id });
    await customer.deleteOne();

    res.json({ success: true, message: 'Customer and loan entry deleted successfully', storage: 'mongodb' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
