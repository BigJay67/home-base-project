const express = require('express');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const StayAgreement = require('../models/StayAgreement');
const StayIssue = require('../models/StayIssue');
const { cloudinary } = require('../config/cloudinary');
const { writeLimiter } = require('../middleware/rateLimiter');
const router = express.Router();

const activeStatuses = ['completed', 'confirmed'];
const clean = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';

async function loadStay(req, res, next) {
  if (!mongoose.isValidObjectId(req.params.bookingId)) return res.status(400).json({ error: 'Invalid booking ID' });
  try {
    const booking = await Booking.findById(req.params.bookingId).populate('listingId', 'name location images createdBy');
    if (!booking) return res.status(404).json({ error: 'Stay not found' });
    const hostId = booking.hostId || booking.listingId?.createdBy;
    if (!booking.listingId || !hostId) return res.status(409).json({ error: 'The property for this booking is unavailable' });
    if (booking.userId !== req.userId && hostId !== req.userId) return res.status(403).json({ error: 'You do not have access to this stay' });
    if (!activeStatuses.includes(booking.status)) return res.status(400).json({ error: 'Stay tools are available after payment is confirmed' });
    req.stayBooking = booking;
    req.stayHostId = hostId;
    next();
  } catch (err) { next(err); }
}

const snapshot = async (req) => {
  const [agreement, issues] = await Promise.all([
    StayAgreement.findOne({ bookingId: req.stayBooking._id }).lean(),
    StayIssue.find({ bookingId: req.stayBooking._id }).sort({ createdAt: -1 }).lean(),
  ]);
  return { booking: req.stayBooking, agreement, issues, role: req.userId === req.stayBooking.userId ? 'guest' : 'host' };
};

router.get('/:bookingId', loadStay, async (req, res, next) => {
  try { res.json(await snapshot(req)); } catch (err) { next(err); }
});

router.put('/:bookingId/agreement', writeLimiter, loadStay, async (req, res, next) => {
  try {
    if (req.userId !== req.stayHostId) return res.status(403).json({ error: 'Only the host can prepare an agreement' });
    const terms = clean(req.body.terms, 8000);
    if (terms.length < 30) return res.status(400).json({ error: 'Add at least 30 characters of clear terms' });
    const existing = await StayAgreement.findOne({ bookingId: req.stayBooking._id });
    if (existing?.status === 'agreed') return res.status(409).json({ error: 'This agreement is already acknowledged by both parties' });
    if (existing && existing.history.length >= 20) return res.status(409).json({ error: 'This agreement has reached its revision limit' });
    const agreement = existing || new StayAgreement({
      bookingId: req.stayBooking._id,
      listingId: req.stayBooking.listingId._id,
      guestId: req.stayBooking.userId,
      hostId: req.stayHostId,
    });
    if (existing) agreement.history.push({ version: existing.version, terms: existing.terms, houseRules: existing.houseRules, moveInInstructions: existing.moveInInstructions, guestAcceptedAt: existing.guestAcceptedAt, hostAcceptedAt: existing.hostAcceptedAt, supersededAt: new Date() });
    agreement.terms = terms;
    agreement.houseRules = clean(req.body.houseRules, 3000);
    agreement.moveInInstructions = clean(req.body.moveInInstructions, 2000);
    agreement.version = existing ? existing.version + 1 : 1;
    agreement.guestAcceptedAt = undefined;
    agreement.hostAcceptedAt = undefined;
    agreement.status = 'awaiting_guest';
    await agreement.save();
    res.json(agreement);
  } catch (err) {
    if (err.name === 'VersionError' || err.code === 11000) return res.status(409).json({ error: 'This agreement changed while you were editing it. Refresh and review the latest version.' });
    next(err);
  }
});

router.post('/:bookingId/agreement/accept', writeLimiter, loadStay, async (req, res, next) => {
  try {
    const agreement = await StayAgreement.findOne({ bookingId: req.stayBooking._id });
    if (!agreement) return res.status(404).json({ error: 'The host has not prepared an agreement yet' });
    if (Number(req.body.version) !== agreement.version) return res.status(409).json({ error: 'This agreement has changed. Refresh and review the latest version before acknowledging.' });
    if (req.userId === agreement.guestId && agreement.status === 'awaiting_guest') {
      agreement.guestAcceptedAt = new Date();
      agreement.status = 'awaiting_host';
    } else if (req.userId === agreement.hostId && agreement.status === 'awaiting_host') {
      agreement.hostAcceptedAt = new Date();
      agreement.status = 'agreed';
    } else return res.status(409).json({ error: 'This agreement is not waiting for your acknowledgement' });
    await agreement.save();
    res.json(agreement);
  } catch (err) {
    if (err.name === 'VersionError') return res.status(409).json({ error: 'This agreement changed. Refresh and review the latest version.' });
    next(err);
  }
});

router.post('/:bookingId/issues', writeLimiter, loadStay, async (req, res, next) => {
  try {
    const kind = req.body.kind;
    const title = clean(req.body.title, 120);
    const description = clean(req.body.description, 3000);
    const severity = req.body.severity || 'normal';
    if (!['move_in', 'move_out', 'maintenance', 'damage'].includes(kind)) return res.status(400).json({ error: 'Choose an issue type' });
    if (title.length < 3 || description.length < 10) return res.status(400).json({ error: 'Add a title and at least 10 characters of detail' });
    if (!['low', 'normal', 'urgent'].includes(severity)) return res.status(400).json({ error: 'Invalid priority' });
    const images = Array.isArray(req.body.photos) ? req.body.photos : [];
    if (images.length > 3) return res.status(400).json({ error: 'Maximum 3 photos per report' });
    if (images.some(image => typeof image !== 'string' || !/^data:image\/(jpeg|png|webp);base64,/.test(image) || image.length > 2800000)) {
      return res.status(400).json({ error: 'Use JPEG, PNG or WebP photos under 2 MB each' });
    }
    const photos = [];
    for (const image of images) {
      const upload = await cloudinary.uploader.upload(image, { folder: 'homebase-stay-evidence', resource_type: 'image' });
      photos.push(upload.secure_url);
    }
    const issue = await StayIssue.create({
      bookingId: req.stayBooking._id,
      listingId: req.stayBooking.listingId._id,
      guestId: req.stayBooking.userId,
      hostId: req.stayHostId,
      reporterId: req.userId,
      kind, title, area: clean(req.body.area, 80), description, severity, photos,
    });
    res.status(201).json(issue);
  } catch (err) { next(err); }
});

router.put('/:bookingId/issues/:issueId', writeLimiter, loadStay, async (req, res, next) => {
  try {
    if (req.userId !== req.stayHostId) return res.status(403).json({ error: 'Only the host can update a report' });
    if (!mongoose.isValidObjectId(req.params.issueId)) return res.status(400).json({ error: 'Invalid report ID' });
    const issue = await StayIssue.findOne({ _id: req.params.issueId, bookingId: req.stayBooking._id });
    if (!issue) return res.status(404).json({ error: 'Report not found' });
    const status = req.body.status;
    if (!['open', 'in_progress', 'resolved'].includes(status)) return res.status(400).json({ error: 'Invalid report status' });
    const previousResponse = issue.hostResponse;
    issue.status = status;
    issue.hostResponse = clean(req.body.hostResponse, 2000);
    if (issue.hostResponse && issue.hostResponse !== previousResponse) {
      issue.updates.push({ authorId: req.userId, text: issue.hostResponse, createdAt: new Date() });
    }
    issue.resolvedAt = status === 'resolved' ? new Date() : undefined;
    await issue.save();
    res.json(issue);
  } catch (err) { next(err); }
});

router.post('/:bookingId/issues/:issueId/updates', writeLimiter, loadStay, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.issueId)) return res.status(400).json({ error: 'Invalid report ID' });
    const text = clean(req.body.text, 2000);
    if (text.length < 2) return res.status(400).json({ error: 'Add a short update' });
    const issue = await StayIssue.findOne({ _id: req.params.issueId, bookingId: req.stayBooking._id });
    if (!issue) return res.status(404).json({ error: 'Report not found' });
    if (issue.updates.length >= 100) return res.status(409).json({ error: 'This report has reached its update limit' });
    issue.updates.push({ authorId: req.userId, text, createdAt: new Date() });
    await issue.save();
    res.status(201).json(issue);
  } catch (err) { next(err); }
});

module.exports = router;
