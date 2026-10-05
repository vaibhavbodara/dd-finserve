const AdvanceFund = require('../models/AdvanceFund');

// @desc    Get all advance loans / investor funds with summary metrics
// @route   GET /api/advance-funds
exports.getAdvanceFunds = async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { fundCode: searchRegex },
        { investorName: searchRegex },
        { mobileNumber: searchRegex },
        { panNumber: searchRegex },
        { address: searchRegex },
      ];
    }

    const funds = await AdvanceFund.find(query).sort({ createdAt: -1 });

    // Aggregate summary metrics across all active/total funds
    const allFunds = await AdvanceFund.find();
    let totalAdvanceFunds = 0;
    let activeInvestorsCount = 0;
    let totalPrincipalRepaid = 0;
    let totalInterestPaid = 0;
    let netOutstandingPrincipal = 0;
    let monthlyInterestObligation = 0;

    for (const f of allFunds) {
      totalAdvanceFunds += Number(f.amountInvested) || 0;
      totalPrincipalRepaid += Number(f.totalPrincipalRepaid) || 0;
      totalInterestPaid += Number(f.totalInterestPaid) || 0;

      if (f.status === 'Active') {
        activeInvestorsCount++;
        netOutstandingPrincipal += Number(f.remainingPrincipal) || 0;
        monthlyInterestObligation += Number(f.monthlyInterestAmount) || 0;
      }
    }

    res.json({
      success: true,
      count: funds.length,
      summary: {
        totalAdvanceFunds,
        activeInvestorsCount,
        totalPrincipalRepaid,
        totalInterestPaid,
        totalPaid: totalPrincipalRepaid + totalInterestPaid,
        netOutstandingPrincipal,
        monthlyInterestObligation,
      },
      data: funds,
    });
  } catch (error) {
    console.error('Error fetching advance funds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve advance fund records',
      error: error.message,
    });
  }
};

// @desc    Get single advance fund by ID
// @route   GET /api/advance-funds/:id
exports.getAdvanceFundById = async (req, res) => {
  try {
    const fund = await AdvanceFund.findById(req.params.id);
    if (!fund) {
      return res.status(404).json({
        success: false,
        message: 'Advance fund record not found',
      });
    }

    res.json({
      success: true,
      data: fund,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create new advance loan / investor fund
// @route   POST /api/advance-funds
exports.createAdvanceFund = async (req, res) => {
  try {
    const {
      investorName,
      mobileNumber,
      email,
      address,
      panNumber,
      aadharNumber,
      amountInvested,
      interestRate,
      interestRateBasis,
      payoutFrequency,
      startDate,
      tenureMonths,
      maturityDate,
      bankDetails,
      securityCheque,
      notes,
      createdBy,
    } = req.body;

    if (!investorName || !mobileNumber || !amountInvested) {
      return res.status(400).json({
        success: false,
        message: 'Investor Name, Mobile Number, and Advance Amount are required.',
      });
    }

    const fund = new AdvanceFund({
      investorName: investorName.trim(),
      mobileNumber: mobileNumber.trim(),
      email: (email || '').trim(),
      address: (address || '').trim(),
      panNumber: (panNumber || '').trim().toUpperCase(),
      aadharNumber: (aadharNumber || '').trim(),
      amountInvested: Number(amountInvested),
      interestRate: Number(interestRate) || 0,
      interestRateBasis: interestRateBasis || 'Monthly',
      payoutFrequency: payoutFrequency || 'Monthly',
      startDate: startDate ? new Date(startDate) : new Date(),
      tenureMonths: Number(tenureMonths) || 12,
      maturityDate: maturityDate ? new Date(maturityDate) : undefined,
      bankDetails: bankDetails || {},
      securityCheque: (securityCheque || '').trim(),
      notes: (notes || '').trim(),
      createdBy: createdBy || 'Admin',
    });

    const savedFund = await fund.save();

    res.status(201).json({
      success: true,
      message: `Advance Fund created successfully with Code ${savedFund.fundCode}`,
      data: savedFund,
    });
  } catch (error) {
    console.error('Error creating advance fund:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating advance fund',
    });
  }
};

// @desc    Update advance fund / investor details
// @route   PUT /api/advance-funds/:id
exports.updateAdvanceFund = async (req, res) => {
  try {
    const fund = await AdvanceFund.findById(req.params.id);
    if (!fund) {
      return res.status(404).json({
        success: false,
        message: 'Advance fund record not found',
      });
    }

    const updatableFields = [
      'investorName',
      'mobileNumber',
      'email',
      'address',
      'panNumber',
      'aadharNumber',
      'interestRate',
      'interestRateBasis',
      'payoutFrequency',
      'tenureMonths',
      'maturityDate',
      'bankDetails',
      'securityCheque',
      'notes',
      'status',
    ];

    updatableFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        fund[field] = req.body[field];
      }
    });

    // If amountInvested is updated
    if (req.body.amountInvested !== undefined) {
      fund.amountInvested = Number(req.body.amountInvested);
      fund.remainingPrincipal = Math.max(0, fund.amountInvested - (fund.totalPrincipalRepaid || 0));
    }

    // Recalculate monthly interest
    const effectiveMonthlyRate = fund.interestRateBasis === 'Yearly' ? fund.interestRate / 12 : fund.interestRate;
    fund.monthlyInterestAmount = Math.round((fund.amountInvested * effectiveMonthlyRate) / 100);
    fund.totalExpectedInterest = Math.round(fund.monthlyInterestAmount * (Number(fund.tenureMonths) || 12));

    const updatedFund = await fund.save();

    res.json({
      success: true,
      message: 'Advance fund record updated successfully',
      data: updatedFund,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Record payout / return payment to investor
// @route   POST /api/advance-funds/:id/payouts
exports.recordPayout = async (req, res) => {
  try {
    const fund = await AdvanceFund.findById(req.params.id);
    if (!fund) {
      return res.status(404).json({
        success: false,
        message: 'Advance fund record not found',
      });
    }

    const {
      amount,
      payoutType,
      principalComponent,
      interestComponent,
      paymentMode,
      transactionRef,
      notes,
      payoutDate,
      recordedBy,
    } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid payout amount is required',
      });
    }

    let pComponent = Number(principalComponent) || 0;
    let iComponent = Number(interestComponent) || 0;

    // Automatic allocation if components not split
    if (pComponent === 0 && iComponent === 0) {
      if (payoutType === 'Principal') {
        pComponent = numAmount;
      } else if (payoutType === 'Interest') {
        iComponent = numAmount;
      } else if (payoutType === 'Settlement') {
        pComponent = Math.min(numAmount, fund.remainingPrincipal);
        iComponent = Math.max(0, numAmount - pComponent);
      } else {
        // Both: default to interest first, remainder to principal
        const interestDue = fund.monthlyInterestAmount || 0;
        iComponent = Math.min(numAmount, interestDue);
        pComponent = Math.max(0, numAmount - iComponent);
      }
    }

    // Generate payoutId
    const payoutCount = (fund.payoutHistory || []).length;
    const payoutId = `PAY-${fund.fundCode.replace('ADV-', '')}-${String(payoutCount + 1).padStart(3, '0')}`;

    const newPayout = {
      payoutId,
      payoutDate: payoutDate ? new Date(payoutDate) : new Date(),
      amount: numAmount,
      payoutType: payoutType || 'Interest',
      principalComponent: pComponent,
      interestComponent: iComponent,
      paymentMode: paymentMode || 'Bank Transfer',
      transactionRef: transactionRef || '',
      notes: notes || '',
      recordedBy: recordedBy || 'Admin',
    };

    fund.payoutHistory.push(newPayout);

    // Recalculate totals
    fund.totalPrincipalRepaid = (fund.totalPrincipalRepaid || 0) + pComponent;
    fund.totalInterestPaid = (fund.totalInterestPaid || 0) + iComponent;
    fund.totalPaid = fund.totalPrincipalRepaid + fund.totalInterestPaid;
    fund.remainingPrincipal = Math.max(0, fund.amountInvested - fund.totalPrincipalRepaid);

    if (fund.remainingPrincipal <= 0) {
      fund.status = 'Closed';
    }

    const saved = await fund.save();

    res.status(201).json({
      success: true,
      message: `Payout of ₹${numAmount} successfully recorded for ${fund.investorName}`,
      data: saved,
      payout: newPayout,
    });
  } catch (error) {
    console.error('Error recording payout:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to record payout',
    });
  }
};

// @desc    Delete payout record and revert totals
// @route   DELETE /api/advance-funds/:id/payouts/:payoutId
exports.deletePayout = async (req, res) => {
  try {
    const fund = await AdvanceFund.findById(req.params.id);
    if (!fund) {
      return res.status(404).json({
        success: false,
        message: 'Advance fund record not found',
      });
    }

    const { payoutId } = req.params;
    const initialCount = fund.payoutHistory.length;
    fund.payoutHistory = fund.payoutHistory.filter(
      (p) => p.payoutId !== payoutId && p._id.toString() !== payoutId
    );

    if (fund.payoutHistory.length === initialCount) {
      return res.status(404).json({
        success: false,
        message: 'Payout transaction not found',
      });
    }

    // Recalculate totals from remaining history
    let newPrincipalRepaid = 0;
    let newInterestPaid = 0;

    for (const p of fund.payoutHistory) {
      newPrincipalRepaid += Number(p.principalComponent) || 0;
      newInterestPaid += Number(p.interestComponent) || 0;
    }

    fund.totalPrincipalRepaid = newPrincipalRepaid;
    fund.totalInterestPaid = newInterestPaid;
    fund.totalPaid = newPrincipalRepaid + newInterestPaid;
    fund.remainingPrincipal = Math.max(0, fund.amountInvested - newPrincipalRepaid);

    if (fund.remainingPrincipal > 0 && fund.status === 'Closed') {
      fund.status = 'Active';
    }

    const saved = await fund.save();

    res.json({
      success: true,
      message: 'Payout record deleted and balance recalculated',
      data: saved,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete advance fund entry
// @route   DELETE /api/advance-funds/:id
exports.deleteAdvanceFund = async (req, res) => {
  try {
    const fund = await AdvanceFund.findByIdAndDelete(req.params.id);
    if (!fund) {
      return res.status(404).json({
        success: false,
        message: 'Advance fund record not found',
      });
    }

    res.json({
      success: true,
      message: `Advance fund ${fund.fundCode} (${fund.investorName}) deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
