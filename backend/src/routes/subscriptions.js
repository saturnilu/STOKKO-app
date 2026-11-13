const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getSubscriptionStatus, checkoutSubscription } = require('../controllers/subscriptionController');

router.get('/me', verifyToken, getSubscriptionStatus);

router.post('/checkout', verifyToken, checkoutSubscription);

module.exports = router;
