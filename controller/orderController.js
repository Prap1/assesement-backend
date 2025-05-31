const Order = require('../model/order');
const Product = require('../model/product');

exports.createOrder = async (req, res) => {
  const { paymentIntentId, productId, quantity } = req.body;

  if (!paymentIntentId || !productId || !quantity) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    // Get product details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check stock
    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    // Calculate total amount
    const totalAmount = product.price * quantity;

    // Create order
    const order = new Order({
      user: req.user._id,
      items: [{
        product: productId,
        quantity: quantity,
        price: product.price
      }],
      totalAmount,
      paymentIntentId,
      status: 'completed'
    });

    // Update product stock
    product.stock -= quantity;
    await product.save();

    // Save order
    await order.save();

    res.status(201).json({ 
      message: 'Order created successfully', 
      order: {
        _id: order._id,
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
        items: order.items
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Failed to create order', error: error.message });
  }
};

// Get all orders for a user
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate({
        path: 'items.product',
        model: 'Product',
        select: 'name price imageUrl description'
      })
      .lean()
      .sort({ createdAt: -1 });
    
    // Transform the data to ensure all fields are present
    const transformedOrders = orders.map(order => {
      // Ensure items array exists
      const items = order.items || [];
      
      return {
        ...order,
        items: items.map(item => {
          // Ensure product exists
          const product = item.product || {};
          
          return {
            ...item,
            product: {
              _id: product._id || '',
              name: product.name || '',
              price: product.price || 0,
              imageUrl: product.imageUrl || '',
              description: product.description || ''
            }
          };
        })
      };
    });

    res.json(transformedOrders);
  } catch (error) {
    console.error('Get my orders error:', error);
    res.status(500).json({ message: 'Failed to get orders', error: error.message });
  }
};

// Get order details
exports.getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate({
        path: 'items.product',
        model: 'Product',
        select: 'name price imageUrl description'
      })
      .populate('user', 'name email')
      .lean();

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if the order belongs to the user
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Transform the data to ensure all fields are present
    const transformedOrder = {
      ...order,
      items: (order.items || []).map(item => {
        const product = item.product || {};
        return {
          ...item,
          product: {
            _id: product._id || '',
            name: product.name || '',
            price: product.price || 0,
            imageUrl: product.imageUrl || '',
            description: product.description || ''
          }
        };
      })
    };

    res.json(transformedOrder);
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({ message: 'Failed to get order details', error: error.message });
  }
};

// Admin: Get all orders
exports.getAllOrders = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Access denied' });
  }

  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .populate({
        path: 'items.product',
        model: 'Product',
        select: 'name price imageUrl description'
      })
      .lean()
      .sort({ createdAt: -1 });
    
    // Transform the data to ensure all fields are present
    const transformedOrders = orders.map(order => {
      const items = order.items || [];
      
      return {
        ...order,
        items: items.map(item => {
          const product = item.product || {};
          
          return {
            ...item,
            product: {
              _id: product._id || '',
              name: product.name || '',
              price: product.price || 0,
              imageUrl: product.imageUrl || '',
              description: product.description || ''
            }
          };
        })
      };
    });

    res.json(transformedOrders);
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({ message: 'Failed to get orders', error: error.message });
  }
};
