const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../model/order');
const Product = require('../model/product');
const User = require('../model/User');

// Create payment intent
const createPaymentIntent = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    
    // Get product details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get user details
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if product is in stock
    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Product is out of stock' });
    }

    // Calculate total amount
    const totalAmount = product.price * quantity;
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount * 100, // Convert to cents
      currency: 'inr',
      description: `Purchase of ${product.name} - ${quantity} unit(s)`,
      shipping: {
        name: user.name,
        address: {
          line1: user.address || 'Not provided',
          city: user.city || 'Not provided',
          state: user.state || 'Not provided',
          postal_code: user.postalCode || '000000',
          country: 'IN'
        }
      },
      metadata: {
        productId: product._id.toString(),
        userId: req.user._id.toString(),
        quantity: quantity.toString(),
        customerName: user.name,
        customerEmail: user.email
      }
    });

    // Create pending order with totalAmount
    const order = await Order.create({
      user: req.user._id,
      items: [{
        product: product._id,
        quantity: quantity,
        price: product.price
      }],
      totalAmount: totalAmount,
      paymentIntentId: paymentIntent.id,
      status: 'pending'
    });

    res.json({ 
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount,
      orderId: order._id
    });
  } catch (error) {
    console.error('Payment intent error:', error);
    res.status(500).json({ message: 'Error creating payment intent' });
  }
};

// Handle webhook events
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      try {
        // Update order status
        const order = await Order.findOneAndUpdate(
          { paymentIntentId: paymentIntent.id },
          { status: 'completed' },
          { new: true }
        );

        if (order) {
          // Update product stock
          await Product.findByIdAndUpdate(
            order.items[0].product,
            { $inc: { stock: -parseInt(paymentIntent.metadata.quantity) } }
          );
          console.log('Order completed and stock updated');
        }
      } catch (error) {
        console.error('Error processing successful payment:', error);
      }
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      try {
        // Update order status to failed
        await Order.findOneAndUpdate(
          { paymentIntentId: failedPayment.id },
          { status: 'failed' }
        );
        console.log('Order marked as failed');
      } catch (error) {
        console.error('Error updating failed order:', error);
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};

// Get order status
const getOrderStatus = async (req, res) => {
  try {
    const order = await Order.findOne({ 
      paymentIntentId: req.params.paymentIntentId,
      user: req.user._id
    }).populate('items.product');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    console.error('Error fetching order status:', error);
    res.status(500).json({ message: 'Error fetching order status' });
  }
};

module.exports = {
  createPaymentIntent,
  handleWebhook,
  getOrderStatus
}; 