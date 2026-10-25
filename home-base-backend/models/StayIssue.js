const mongoose = require('mongoose');

const stayIssueSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing', required: true },
  guestId: { type: String, required: true },
  hostId: { type: String, required: true },
  reporterId: { type: String, required: true },
  kind: { type: String, enum: ['move_in', 'move_out', 'maintenance', 'damage'], required: true },
  title: { type: String, required: true, maxlength: 120 },
  area: { type: String, default: '', maxlength: 80 },
  description: { type: String, required: true, maxlength: 3000 },
  severity: { type: String, enum: ['low', 'normal', 'urgent'], default: 'normal' },
  photos: [{ type: String }],
  status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
  hostResponse: { type: String, default: '', maxlength: 2000 },
  updates: [{ authorId: String, text: { type: String, maxlength: 2000 }, createdAt: Date }],
  resolvedAt: Date,
}, { timestamps: true });

stayIssueSchema.index({ bookingId: 1, createdAt: -1 });
stayIssueSchema.index({ hostId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('StayIssue', stayIssueSchema);
