const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createPaymentIntent,
  handleWebhook,
  getOrderStatus,
  verifyPayment
} = require('../controller/paymentController');

// Create payment intent
router.post('/create-payment-intent', protect, createPaymentIntent);


router.post('/verify', protect, verifyPayment);

// Get order status
router.get('/order-status/:paymentIntentId', protect, getOrderStatus);

// Stripe webhook endpoint (⚠️ No middleware like protect or express.json)
// router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

module.exports = router;
