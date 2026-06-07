// Builds the shared arena state from persisted bookings: runs DB bookings through
// the engine and enriches the result with each court's owner.

import { calculateAvailability } from '@arena/engine';
import Booking from '../models/Booking.js';

export async function buildArenaState() {
  const bookings = await Booking.find().populate('user', 'name').lean();

  const courts = bookings.map((b) => b.court);
  const result = calculateAvailability(courts);

  const bookedBy = {};
  for (const b of bookings) {
    bookedBy[b.court] = {
      userId: b.user?._id?.toString() ?? '',
      name: b.user?.name ?? 'Unknown',
      at: b.createdAt ? new Date(b.createdAt).toISOString() : '',
    };
  }

  return { ...result, bookedBy };
}
