require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const cancelled = await Booking.updateMany(
      { paymentReference: /^PENDING-/, status: { $in: ['pending', 'confirmed'] } },
      { $set: { status: 'cancelled' } }
    );

    const missing = await Booking.find({
      $or: [{ hostId: { $exists: false } }, { hostId: null }, { hostId: '' }]
    });

    let fixed = 0;
    for (const booking of missing) {
      const listing = await Listing.findById(booking.listingId).select('createdBy');
      if (listing && listing.createdBy) {
        await Booking.updateOne(
          { _id: booking._id },
          { $set: { hostId: listing.createdBy, totalAmount: booking.totalAmount || booking.amount } }
        );
        fixed += 1;
      }
    }

    console.log(`Cancelled ${cancelled.modifiedCount} leftover unpaid bookings`);
    console.log(`Checked ${missing.length} bookings without a host, updated ${fixed}`);
  } catch (err) {
    console.error('Backfill failed:', err.message);
  } finally {
    await mongoose.connection.close();
  }
}

run();