const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const requestIp = require('request-ip');
const faker = require('faker');
const chargebee = require('chargebee');

dotenv.config();

chargebee.configure({
    site: "your-site",
    api_key: process.env.CHARGEBEE_API_KEY
});

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

app.use(requestIp.mw({ attributeName: 'clientIp' }));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/config', (req, res) => {
    res.send({ publishableKey: process.env.STRIPE_PUBLISHABLE_KEY });
});

app.post('/create-payment-intent', async (req, res) => {
    const { amount, currency, customerEmail, customerName, customerAddress, description } = req.body;

    // Use IP address matching the geographic location
    const clientIp = req.clientIp || faker.internet.ip();
    const userAgent = req.headers['user-agent'] || faker.internet.userAgent();

    try {
        console.log('Creating Stripe payment intent...');
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            receipt_email: customerEmail,
            description: description,
            metadata: { clientIp, userAgent },
            shipping: {
                name: customerName,
                address: customerAddress,
            },
        });

        console.log('Stripe payment intent created:', paymentIntent.id);

        // Optionally create a customer in Chargebee
        console.log('Creating Chargebee customer...');
        const chargebeeCustomer = await chargebee.customer.create({
            first_name: customerName.split(' ')[0],
            last_name: customerName.split(' ')[1] || '',
            email: customerEmail,
            auto_collection: "on",
            billing_address: customerAddress
        }).request();

        console.log('Chargebee customer created:', chargebeeCustomer.customer.id);

        res.send({
            clientSecret: paymentIntent.client_secret,
            chargebeeCustomer: chargebeeCustomer
        });
    } catch (error) {
        console.error('Error creating payment intent or Chargebee customer:', error);
        res.status(500).send({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
