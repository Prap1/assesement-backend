const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  price: {
    type: Number,
    required: true,
    min: 0,
  },

  description: {
    type: String,
    required: true,
    trim: true,
  },

  imageUrl: {
    type: String, // You can store the file path or a full URL
    required: true,
  },

  stock: {
    type: Number,
    required: true,
    min: 0,
  },

  inStock: {
    type: Boolean,
    default: true,
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }

}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
