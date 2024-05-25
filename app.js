const express = require('express');
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const bodyParser = require('body-parser');
    const dotenv = require('dotenv');

    dotenv.config();

    const app = express();
    app.use(bodyParser.json());
    app.use(express.static('views'));
    app.set('view engine', 'html');
    app.engine('html', require('ejs').renderFile);

    // Serve the main page
    app.get('/', (req, res) => {
      res.render('index.html', { publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
    });

    // Create a checkout session
    app.post('/create-checkout-session', async (req, res) => {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'T-shirt',
              },
              unit_amount: 2000,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.headers.origin}/success.html`,
        cancel_url: `${req.headers.origin}/`,
      });

      res.json({ id: session.id });
    });

    // Handle payment intents
    app.post('/create-payment-intent', async (req, res) => {
      const { amount } = req.body;

      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'usd',
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // Create a subscription
    app.post('/create-subscription', async (req, res) => {
      const { paymentMethodId, customerEmail } = req.body;

      // Create customer
      const customer = await stripe.customers.create({
        payment_method: paymentMethodId,
        email: customerEmail,
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ plan: 'price_1IbRfmCKUTYIL9IlHxtEKG6O' }],
        expand: ['latest_invoice.payment_intent'],
      });

      res.send(subscription);
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));