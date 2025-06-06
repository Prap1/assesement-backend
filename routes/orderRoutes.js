const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { createOrder, getMyOrders, getOrderDetails, getAllOrders, processOrder } = require('../controller/orderController');

router.use(protect);

router.post('/', createOrder); // after payment
router.get('/my-orders', getMyOrders); // user order history
router.get('/:orderId', getOrderDetails);
router.get('/all', getAllOrders); // admin only
router.post('/process',processOrder);

module.exports = router;
