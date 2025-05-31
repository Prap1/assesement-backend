const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  createProduct,
  updateProduct,
  getProducts,
  getProduct,
  deleteProduct
} = require('../controller/productController');

router.post('/', protect, adminOnly, upload.single('image'), createProduct);
router.put('/:id', protect, adminOnly, upload.single('image'), updateProduct);
router.get('/get', getProducts);
router.get('/:id/get', getProduct);
router.delete('/:id/delete', protect, adminOnly, deleteProduct);

module.exports = router;
