const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../model/order');
const Product = require('../model/product');
const User = require('../model/User');

// ✅ Create Payment Intent
const createPaymentIntent = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (product.stock < quantity) {
      return res.status(400).json({ message: 'Insufficient stock available' });
    }

    const totalAmount = product.price * quantity;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount * 100,
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

    const order = await Order.create({
      user: req.user._id,
      items: [{ product: product._id, quantity, price: product.price }],
      totalAmount,
      paymentIntentId: paymentIntent.id,
      status: 'pending'
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount,
      orderId: order._id
    });
  } catch (error) {
    console.error('❌ Error creating payment intent:', error);
    res.status(500).json({ message: 'Server error while creating payment intent' });
  }
};

// ✅ Stripe Webhook Handler
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
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const { type, data } = event;

  switch (type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = data.object;
      console.log('✅ Payment succeeded:', paymentIntent.id);

      try {
        const order = await Order.findOneAndUpdate(
          { paymentIntentId: paymentIntent.id },
          { status: 'completed' },
          { new: true }
        );

        if (!order) {
          console.warn('⚠️ Order not found for PaymentIntent ID:', paymentIntent.id);
          break;
        }

        const quantity = parseInt(paymentIntent.metadata.quantity || '1');
        const productId = paymentIntent.metadata.productId;

        await Product.findByIdAndUpdate(
          productId,
          { $inc: { stock: -quantity } }
        );

        console.log(`✅ Stock updated: -${quantity} units for product ${productId}`);
      } catch (error) {
        console.error('❌ Error completing order or updating stock:', error);
      }
      break;
    }

    case 'payment_intent.payment_failed': {
      const failedPayment = data.object;
      console.log('❌ Payment failed:', failedPayment.id);

      try {
        await Order.findOneAndUpdate(
          { paymentIntentId: failedPayment.id },
          { status: 'failed' }
        );
        console.log('⚠️ Order marked as failed');
      } catch (error) {
        console.error('❌ Error marking order as failed:', error);
      }
      break;
    }

    default:
      console.log(`ℹ️ Unhandled event type: ${type}`);
  }

  res.status(200).json({ received: true });
};

// ✅ Get Order Status
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
    console.error('❌ Error fetching order:', error);
    res.status(500).json({ message: 'Error fetching order status' });
  }
};

// Verify Stripe payment session (you can adapt this if using Checkout Sessions instead of PaymentIntents)
const verifyPayment = async (req, res) => {
  const { paymentIntentId, orderId } = req.body;


  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log('paymentIntent', paymentIntent);

    if (paymentIntent.status === 'succeeded') {
      return res.json({ verified: true });
    } else {
      return res.json({ verified: false });
    }
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ verified: false, message: 'Verification failed' });
  }
};



module.exports = {
  createPaymentIntent,
  handleWebhook,
  getOrderStatus,
  verifyPayment
};
