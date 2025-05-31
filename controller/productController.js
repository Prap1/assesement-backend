const Product = require('../model/product');
const fs = require('fs');
const path = require('path');

// Add New Product
exports.createProduct = async (req, res) => {
  try {
    const { name, price, description, stock } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!imageUrl) return res.status(400).json({ message: 'Image is required' });

    const product = new Product({
      name,
      price,
      description,
      stock,
      inStock: stock > 0,
      imageUrl,
      createdBy: req.user._id,
    });

    await product.save();
    res.status(201).json({ message: 'Product created successfully', product });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get All Products
exports.getProducts = async (req, res) => {
  try {
    const products = await Product.find().populate('createdBy', 'name email');
    res.json(products);
  } catch (err) {
    console.error('Fetch products error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get Single Product
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    console.error('Fetch single product error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update Product
exports.updateProduct = async (req, res) => {
  try {
    const { name, price, description, stock } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Check ownership
    if (product.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    product.name = name;
    product.price = price;
    product.description = description;
    product.stock = stock;
    product.inStock = stock > 0;

    if (req.file) {
      // Delete old image
      const oldImage = path.join(__dirname, `../public${product.imageUrl}`);
      if (fs.existsSync(oldImage)) fs.unlinkSync(oldImage);
      product.imageUrl = `/uploads/${req.file.filename}`;
    }

    await product.save();
    res.json({ message: 'Product updated', product });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Check ownership
    if (product.createdBy.toString() !== req.user._id.toString()) {
  return res.status(403).json({ message: 'Unauthorized' });
}


    // Delete image
    const imagePath = path.join(__dirname, `../public${product.imageUrl}`);
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);

    await product.deleteOne();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
