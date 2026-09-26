const express = require('express');
const router = express.Router();
const {
  recordCollection,
  getTodayCollectionSheet,
  getCollections,
  getReceipt,
} = require('../controllers/collectionController');

router.route('/')
  .get(getCollections)
  .post(recordCollection);

router.route('/today-sheet')
  .get(getTodayCollectionSheet);

router.route('/receipt/:id')
  .get(getReceipt);

module.exports = router;
