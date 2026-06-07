// Booking model. The turf is shared, so a court has at most one active booking;
// the unique index on `court` prevents concurrent double-booking at the DB level.

import mongoose from 'mongoose';
import { ALL_COURTS } from '@arena/engine';

const bookingSchema = new mongoose.Schema(
  {
    court: { type: String, required: true, enum: ALL_COURTS, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;
