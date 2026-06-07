// Booking routes (all require auth). Bookings are global; only the owner may cancel.

import { Router } from 'express';
import { ALL_COURTS } from '@arena/engine';
import Booking from '../models/Booking.js';
import { requireAuth } from '../middleware/auth.js';
import { buildArenaState } from '../services/arenaState.js';

const router = Router();

router.use(requireAuth);

// GET /api/bookings -> list all current bookings with owners.
router.get('/', async (_req, res) => {
  const bookings = await Booking.find().populate('user', 'name').sort({ createdAt: 1 }).lean();
  res.json(
    bookings.map((b) => ({
      court: b.court,
      user: { id: b.user?._id?.toString(), name: b.user?.name },
      createdAt: b.createdAt,
    })),
  );
});

// POST /api/bookings -> book a court (rejects already-booked or blocked courts).
router.post('/', async (req, res) => {
  const court = String(req.body?.court ?? '').trim().toUpperCase();
  const userId = req.user.id;

  if (!ALL_COURTS.includes(court)) {
    return res.status(400).json({ error: `Unknown court "${court}"` });
  }

  try {
    // Validate against current shared state before writing.
    const state = await buildArenaState();
    if (state.booked.includes(court)) {
      return res.status(409).json({ error: `Court ${court} is already booked` });
    }
    if (state.blocked.includes(court)) {
      return res.status(409).json({ error: `Court ${court} is blocked by an overlapping booking` });
    }

    await Booking.create({ court, user: userId });
    const nextState = await buildArenaState();
    return res.status(201).json({ state: nextState });
  } catch (err) {
    // Unique-index race: another user grabbed the court first.
    if (err?.code === 11000) {
      return res.status(409).json({ error: `Court ${court} was just booked by someone else` });
    }
    console.error('create booking error:', err);
    return res.status(500).json({ error: 'Failed to create booking' });
  }
});

// DELETE /api/bookings/:court -> cancel; only the owner may do so.
router.delete('/:court', async (req, res) => {
  const court = String(req.params.court ?? '').trim().toUpperCase();
  const userId = req.user.id;

  if (!ALL_COURTS.includes(court)) {
    return res.status(400).json({ error: `Unknown court "${court}"` });
  }

  try {
    const booking = await Booking.findOne({ court });
    if (!booking) {
      return res.status(404).json({ error: `Court ${court} is not booked` });
    }
    if (booking.user.toString() !== userId) {
      return res.status(403).json({ error: 'You can only cancel your own bookings' });
    }

    await booking.deleteOne();
    const state = await buildArenaState();
    return res.json({ state });
  } catch (err) {
    console.error('delete booking error:', err);
    return res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

export default router;
