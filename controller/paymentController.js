const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const Product = require('../model/product');

exports.createPaymentIntent = async (req, res) => {
  const { productId, quantity } = req.body;

  if (!productId || !quantity) {
    return res.status(400).json({ message: 'Product ID and quantity are required' });
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

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'inr', // Using INR for Indian Rupees
      metadata: {
        userId: req.user._id.toString(),
        productId: productId,
        quantity: quantity
      },
      description: `Purchase of ${product.name} (${quantity} units)`
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      amount: totalAmount,
      product: {
        name: product.name,
        price: product.price,
        quantity: quantity
      }
    });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ message: 'Failed to create payment intent', error: error.message });
  }
};

// Webhook handler for Stripe events
exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Use raw body here!
    event = stripe.webhooks.constructEvent(
      req.body, // raw body, not parsed JSON
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle events
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('PaymentIntent was successful:', paymentIntent.id);
      // Optional: create order here
      break;
    case 'payment_intent.payment_failed':
      console.log('PaymentIntent failed');
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
};

