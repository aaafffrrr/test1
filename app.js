const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const requestIp = require('request-ip');

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
    const clientIp = req.clientIp || '192.168.0.1'; // Spoofed IP address
    const userAgent = req.headers['user-agent'] || 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15A372 Safari/604.1'; // Spoofed User-Agent

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            receipt_email: 'customer@example.com',
            description: 'Insecure Payment',
            metadata: { clientIp, userAgent }
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
