const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createPaymentIntent,
  handleWebhook,
  getOrderStatus
} = require('../controllers/paymentController');

// Create payment intent
router.post('/create-payment-intent', protect, createPaymentIntent);



// Get order status
router.get('/order-status/:paymentIntentId', protect, getOrderStatus);

module.exports = router;
