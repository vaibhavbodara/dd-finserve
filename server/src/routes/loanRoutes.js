const express = require('express');
const router = express.Router();
const {
  getLoans,
  getLoanById,
  createLoan,
  updateLoanStatus,
} = require('../controllers/loanController');

router.route('/')
  .get(getLoans)
  .post(createLoan);

router.route('/:id')
  .get(getLoanById);

router.route('/:id/status')
  .put(updateLoanStatus);

module.exports = router;
