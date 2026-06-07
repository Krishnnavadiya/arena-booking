// Pure, deterministic availability engine. Single source of truth, reused by
// both the Express API and the React UI.

import { ALL_COURTS, ADJACENCY } from './overlapMap.js';

// Sanitise untrusted input into clean, unique, upper-cased IDs in canonical order.
// Tolerates null/undefined, blanks, unknown IDs, casing and duplicates; throws on non-array.
export function normalizeBookings(bookings) {
  if (bookings === null || bookings === undefined) return [];
  if (!Array.isArray(bookings)) {
    throw new TypeError('bookings must be an array of court IDs (or null/undefined)');
  }

  const seen = new Set();
  for (const raw of bookings) {
    if (raw === null || raw === undefined) continue;
    const id = String(raw).trim().toUpperCase();
    if (id === '') continue;
    if (!ALL_COURTS.includes(id)) continue;
    seen.add(id);
  }

  return ALL_COURTS.filter((court) => seen.has(court));
}

// Compute { booked, blocked, available } for a set of bookings.
// The three arrays always partition ALL_COURTS exactly once; booked beats blocked.
export function calculateAvailability(bookings) {
  const booked = normalizeBookings(bookings);
  const bookedSet = new Set(booked);

  const blockedSet = new Set();
  for (const court of booked) {
    for (const neighbour of ADJACENCY[court]) {
      // A booked court is never downgraded to blocked.
      if (!bookedSet.has(neighbour)) blockedSet.add(neighbour);
    }
  }

  const blocked = ALL_COURTS.filter((court) => blockedSet.has(court));
  const available = ALL_COURTS.filter(
    (court) => !bookedSet.has(court) && !blockedSet.has(court),
  );

  return { booked, blocked, available };
}

// Map every court ID to its status for O(1) lookups by grid-style UIs.
export function getCourtStatuses(bookings) {
  const { booked, blocked } = calculateAvailability(bookings);
  const bookedSet = new Set(booked);
  const blockedSet = new Set(blocked);

  const statuses = {};
  for (const court of ALL_COURTS) {
    if (bookedSet.has(court)) statuses[court] = 'booked';
    else if (blockedSet.has(court)) statuses[court] = 'blocked';
    else statuses[court] = 'available';
  }
  return statuses;
}
