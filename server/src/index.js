// Express API: thin HTTP layer over @arena/engine + MongoDB + JWT auth.

import express from 'express';
import cors from 'cors';

import config from './config.js';
import { connectDB } from './db.js';
import { ALL_COURTS } from '@arena/engine';

import authRoutes from './routes/auth.js';
import availabilityRoutes from './routes/availability.js';
import bookingRoutes from './routes/bookings.js';

const app = express();

app.use(cors());
app.use(express.json());

// Request log.
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.url}`);
  next();
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'arena-availability', courts: ALL_COURTS });
});

app.use('/api/auth', authRoutes);
app.use('/api', availabilityRoutes); // /api/courts, /api/availability
app.use('/api/bookings', bookingRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

// Centralised error handler.
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    await connectDB();
    app.listen(config.port, () => {
      console.log(`Arena API listening on http://localhost:${config.port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err instanceof Error ? err.message : err);
    console.error('Is MongoDB running? Expected at:', config.mongoUri);
    process.exit(1);
  }
}

if (!config.isTest) start();

export default app;
