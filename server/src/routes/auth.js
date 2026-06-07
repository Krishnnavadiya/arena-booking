// Authentication routes: signup, login, current-user (me).

import { Router } from 'express';
import User from '../models/User.js';
import { signToken, requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/signup -> 201 { token, user }
router.post('/signup', async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const user = new User({ name, email });
    await user.setPassword(password);
    await user.save();

    const token = signToken({ id: user._id.toString(), email: user.email });
    return res.status(201).json({ token, user: user.toPublicJSON() });
  } catch (err) {
    if (err?.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors)[0]?.message || 'Invalid data' });
    }
    if (err?.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    console.error('signup error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
});

// POST /api/auth/login -> 200 { token, user }
router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // passwordHash is select:false, so request it explicitly.
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await user.verifyPassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({ id: user._id.toString(), email: user.email });
    return res.json({ token, user: user.toPublicJSON() });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
});

// GET /api/auth/me -> 200 { user }
router.get('/me', requireAuth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: user.toPublicJSON() });
});

export default router;
