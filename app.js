const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const requestIp = require('request-ip');
const faker = require('faker');

dotenv.config();

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
    const { amount, currency } = req.body;

    // Generate realistic customer data
    const customerEmail = faker.internet.email();
    const customerName = faker.name.findName();
    const customerAddress = {
        line1: faker.address.streetAddress(),
        city: faker.address.city(),
        postal_code: faker.address.zipCode(),
        country: faker.address.countryCode(),
    };

    // Use IP address matching the geographic location
    const clientIp = req.clientIp || faker.internet.ip(); // Use a more sophisticated approach for real IP geolocation
    const userAgent = req.headers['user-agent'] || faker.internet.userAgent();

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            receipt_email: customerEmail,
            description: 'Legitimate-looking Payment',
            metadata: { clientIp, userAgent },
            shipping: {
                name: customerName,
                address: customerAddress,
            },
        });

        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
