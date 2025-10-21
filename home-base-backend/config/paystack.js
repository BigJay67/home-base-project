const Paystack = require('paystack-api');
const dotenv = require('dotenv');
dotenv.config();

const paystack = Paystack(process.env.PAYSTACK_SECRET_KEY);

module.exports = { paystack };