const express = require('express');
const router = express.Router();
const {
  getAdvanceFunds,
  getAdvanceFundById,
  createAdvanceFund,
  updateAdvanceFund,
  recordPayout,
  deletePayout,
  deleteAdvanceFund,
} = require('../controllers/advanceFundController');

router.route('/')
  .get(getAdvanceFunds)
  .post(createAdvanceFund);

router.route('/:id')
  .get(getAdvanceFundById)
  .put(updateAdvanceFund)
  .delete(deleteAdvanceFund);

router.route('/:id/payouts')
  .post(recordPayout);

router.route('/:id/payouts/:payoutId')
  .delete(deletePayout);

module.exports = router;
