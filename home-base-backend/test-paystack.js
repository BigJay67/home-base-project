const Paystack = require('paystack-api')(process.env.PAYSTACK_SECRET_KEY);
require('dotenv').config();

async function test() {
  try {
    const response = await Paystack.transaction.initialize({
      email: 'test@example.com',
      amount: 3000000, // ₦30,000 in kobo
      callback_url: 'http://192.168.0.192:3000/payment-callback',
    });
    console.log(response);
  } catch (err) {
    console.error('Paystack error:', err);
  }
}

test();