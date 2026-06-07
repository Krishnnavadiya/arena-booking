// Public availability + court catalogue routes.

import { Router } from 'express';
import { ALL_COURTS, COURT_META, OVERLAPS } from '@arena/engine';
import { buildArenaState } from '../services/arenaState.js';

const router = Router();

// GET /api/courts -> static catalogue + overlap model.
router.get('/courts', (_req, res) => {
  res.json({
    courts: ALL_COURTS.map((id) => COURT_META[id]),
    overlaps: OVERLAPS,
  });
});

// GET /api/availability -> live shared arena state for all users.
router.get('/availability', async (_req, res) => {
  try {
    const state = await buildArenaState();
    res.json(state);
  } catch (err) {
    console.error('availability error:', err);
    res.status(500).json({ error: 'Failed to load availability' });
  }
});

export default router;
