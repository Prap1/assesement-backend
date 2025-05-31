const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createOrder, getMyOrders, getOrderDetails, getAllOrders } = require('../controller/orderController');

router.use(protect);

router.post('/', createOrder); // after payment
router.get('/my-orders', getMyOrders); // user order history
router.get('/:orderId', getOrderDetails);
router.get('/all', getAllOrders); // admin only

module.exports = router;
