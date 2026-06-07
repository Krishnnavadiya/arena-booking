import { describe, it, expect } from 'vitest';
import {
  calculateAvailability,
  getCourtStatuses,
  normalizeBookings,
} from '../src/availabilityEngine.js';
import { ALL_COURTS, ADJACENCY, buildAdjacency } from '../src/overlapMap.js';

// Generate every k-sized combination of `items`.
function combinations(items, k) {
  if (k === 0) return [[]];
  if (k > items.length) return [];
  const [first, ...rest] = items;
  const withFirst = combinations(rest, k - 1).map((c) => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

// Sort helper for order-independent comparisons.
const sorted = (arr) => [...arr].sort();

describe('normalizeBookings', () => {
  it('treats null and undefined as no bookings', () => {
    expect(normalizeBookings(null)).toEqual([]);
    expect(normalizeBookings(undefined)).toEqual([]);
  });

  it('returns [] for an empty array', () => {
    expect(normalizeBookings([])).toEqual([]);
  });

  it('removes duplicate bookings', () => {
    expect(normalizeBookings(['A', 'A', 'A'])).toEqual(['A']);
    expect(normalizeBookings(['B', 'A', 'B'])).toEqual(['A', 'B']);
  });

  it('ignores unknown court IDs', () => {
    expect(normalizeBookings(['A', 'Z', 'Q', 'X'])).toEqual(['A', 'X']);
    expect(normalizeBookings(['unknown'])).toEqual([]);
  });

  it('ignores null / empty / whitespace entries inside the array', () => {
    expect(normalizeBookings(['A', null, undefined, '', '   ', 'B'])).toEqual(['A', 'B']);
  });

  it('normalises case and surrounding whitespace', () => {
    expect(normalizeBookings([' a ', 'x', 'B'])).toEqual(['A', 'B', 'X']);
  });

  it('returns IDs in canonical order regardless of input order', () => {
    expect(normalizeBookings(['Y', 'C', 'X', 'A', 'B'])).toEqual(['A', 'B', 'C', 'X', 'Y']);
  });

  it('throws a TypeError for non-array, non-nullish input', () => {
    expect(() => normalizeBookings('A')).toThrow(TypeError);
    expect(() => normalizeBookings(42)).toThrow(TypeError);
    expect(() => normalizeBookings({ A: true })).toThrow(TypeError);
  });
});

describe('calculateAvailability - assignment scenarios', () => {
  it('Scenario 1: A booked -> blocks X', () => {
    expect(calculateAvailability(['A'])).toEqual({
      booked: ['A'],
      blocked: ['X'],
      available: ['B', 'C', 'Y'],
    });
  });

  it('Scenario 2: X booked -> blocks A, B', () => {
    expect(calculateAvailability(['X'])).toEqual({
      booked: ['X'],
      blocked: ['A', 'B'],
      available: ['C', 'Y'],
    });
  });

  it('Scenario 3: A + B booked -> blocks X, Y', () => {
    expect(calculateAvailability(['A', 'B'])).toEqual({
      booked: ['A', 'B'],
      blocked: ['X', 'Y'],
      available: ['C'],
    });
  });

  it('Scenario 4: X + Y booked -> blocks A, B, C (none available)', () => {
    expect(calculateAvailability(['X', 'Y'])).toEqual({
      booked: ['X', 'Y'],
      blocked: ['A', 'B', 'C'],
      available: [],
    });
  });
});

describe('calculateAvailability - no bookings', () => {
  it('reports every court as available', () => {
    expect(calculateAvailability([])).toEqual({
      booked: [],
      blocked: [],
      available: ['A', 'B', 'C', 'X', 'Y'],
    });
  });

  it('handles null/undefined as no bookings', () => {
    const empty = { booked: [], blocked: [], available: [...ALL_COURTS] };
    expect(calculateAvailability(null)).toEqual(empty);
    expect(calculateAvailability(undefined)).toEqual(empty);
  });
});

describe('calculateAvailability - every single booking', () => {
  // Expected blocked courts per single booking.
  const expectedBlocked = {
    A: ['X'],
    B: ['X', 'Y'],
    C: ['Y'],
    X: ['A', 'B'],
    Y: ['B', 'C'],
  };

  for (const court of ALL_COURTS) {
    it(`booking ${court} blocks exactly ${expectedBlocked[court].join(', ')}`, () => {
      const result = calculateAvailability([court]);
      expect(result.booked).toEqual([court]);
      expect(result.blocked).toEqual(expectedBlocked[court]);
    });
  }
});

describe('calculateAvailability - mixed parent/child scenarios', () => {
  it('A + Y -> blocks X, B, C', () => {
    expect(calculateAvailability(['A', 'Y'])).toEqual({
      booked: ['A', 'Y'],
      blocked: ['B', 'C', 'X'],
      available: [],
    });
  });

  it('C + X -> blocks A, B, Y', () => {
    expect(calculateAvailability(['C', 'X'])).toEqual({
      booked: ['C', 'X'],
      blocked: ['A', 'B', 'Y'],
      available: [],
    });
  });

  it('B + Y -> B blocks X,Y but Y is booked so only X blocked; Y blocks B(booked),C', () => {
    expect(calculateAvailability(['B', 'Y'])).toEqual({
      booked: ['B', 'Y'],
      blocked: ['C', 'X'],
      available: ['A'],
    });
  });

  it('A + B + Y -> blocks X, C', () => {
    expect(calculateAvailability(['A', 'B', 'Y'])).toEqual({
      booked: ['A', 'B', 'Y'],
      blocked: ['C', 'X'],
      available: [],
    });
  });
});

describe('calculateAvailability - invariants over ALL combinations', () => {
  // Build every possible subset of courts (2^5 = 32 combinations).
  const allSubsets = [];
  for (let k = 0; k <= ALL_COURTS.length; k++) {
    allSubsets.push(...combinations(ALL_COURTS, k));
  }

  it('covers all 32 subsets', () => {
    expect(allSubsets).toHaveLength(2 ** ALL_COURTS.length);
  });

  for (const subset of allSubsets) {
    const label = subset.length ? subset.join('+') : '(none)';
    it(`[${label}] satisfies all engine invariants`, () => {
      const { booked, blocked, available } = calculateAvailability(subset);

      // 1. The three buckets partition ALL_COURTS exactly once each.
      const union = sorted([...booked, ...blocked, ...available]);
      expect(union).toEqual([...ALL_COURTS]);
      expect(new Set(union).size).toBe(ALL_COURTS.length);

      // 2. No duplicates within any bucket.
      expect(new Set(booked).size).toBe(booked.length);
      expect(new Set(blocked).size).toBe(blocked.length);
      expect(new Set(available).size).toBe(available.length);

      // 3. Booked exactly matches the (normalised) input.
      expect(booked).toEqual(normalizeBookings(subset));

      // 4. A booked court is never blocked.
      for (const court of booked) expect(blocked).not.toContain(court);

      // 5. Every blocked court overlaps at least one booked court.
      const bookedSet = new Set(booked);
      for (const court of blocked) {
        const overlapsBooked = ADJACENCY[court].some((n) => bookedSet.has(n));
        expect(overlapsBooked).toBe(true);
      }

      // 6. Every available court overlaps no booked court.
      for (const court of available) {
        const overlapsBooked = ADJACENCY[court].some((n) => bookedSet.has(n));
        expect(overlapsBooked).toBe(false);
      }
    });
  }
});

describe('calculateAvailability - determinism & purity', () => {
  it('is deterministic across repeated calls', () => {
    const input = ['Y', 'A'];
    const first = calculateAvailability(input);
    const second = calculateAvailability(input);
    expect(first).toEqual(second);
  });

  it('does not mutate its input array', () => {
    const input = ['Y', 'A', 'A'];
    const copy = [...input];
    calculateAvailability(input);
    expect(input).toEqual(copy);
  });
});

describe('getCourtStatuses', () => {
  it('maps each court to its status', () => {
    expect(getCourtStatuses(['A'])).toEqual({
      A: 'booked',
      B: 'available',
      C: 'available',
      X: 'blocked',
      Y: 'available',
    });
  });

  it('marks everything available with no bookings', () => {
    expect(getCourtStatuses([])).toEqual({
      A: 'available',
      B: 'available',
      C: 'available',
      X: 'available',
      Y: 'available',
    });
  });
});

describe('buildAdjacency', () => {
  it('produces a symmetric (bidirectional) graph', () => {
    expect(ADJACENCY).toEqual({
      A: ['X'],
      B: ['X', 'Y'],
      C: ['Y'],
      X: ['A', 'B'],
      Y: ['B', 'C'],
    });
  });

  it('ignores overlap references to unknown courts', () => {
    const adj = buildAdjacency({ X: ['A', 'ZZZ'] }, ['A', 'B', 'X']);
    expect(adj).toEqual({ A: ['X'], B: [], X: ['A'] });
  });
});
