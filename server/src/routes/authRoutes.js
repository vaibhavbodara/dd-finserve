const express = require('express');
const router = express.Router();
const { login, getMe, updateProfile, getUsers } = require('../controllers/authController');

router.post('/login', login);
router.get('/me', getMe);
router.put('/profile', updateProfile);
router.get('/users', getUsers);

module.exports = router;
