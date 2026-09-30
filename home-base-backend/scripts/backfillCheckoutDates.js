require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../models/Booking');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const missing = await Booking.find({
      moveInDate: { $ne: null },
      $or: [{ checkOutDate: { $exists: false } }, { checkOutDate: null }],
    });

    let fixed = 0;
    for (const booking of missing) {
      const checkOut = new Date(booking.moveInDate);
      checkOut.setUTCDate(checkOut.getUTCDate() + 30); // default 30-day stay
      await Booking.updateOne({ _id: booking._id }, { $set: { checkOutDate: checkOut } });
      fixed += 1;
    }

    console.log(`Backfilled checkOutDate on ${fixed} booking(s)`);
  } catch (err) {
    console.error('Backfill failed:', err.message);
  } finally {
    await mongoose.connection.close();
  }
}

run();