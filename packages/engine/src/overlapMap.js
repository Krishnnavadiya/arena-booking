// Physical overlap model: large courts (X, Y / 7v7) are laid over the small
// courts (A, B, C / 5v5), so X covers A+B and Y covers B+C.

// Canonical ordered court list; defines deterministic engine output order.
export const ALL_COURTS = Object.freeze(['A', 'B', 'C', 'X', 'Y']);

// Single source of truth for overlap (parent -> children).
export const OVERLAPS = Object.freeze({
  X: Object.freeze(['A', 'B']),
  Y: Object.freeze(['B', 'C']),
});

// Static court metadata used by the UI and API.
export const COURT_META = Object.freeze({
  A: { id: 'A', name: 'Court A', type: 'small', format: '5v5', description: 'Small court (left)' },
  B: { id: 'B', name: 'Court B', type: 'small', format: '5v5', description: 'Small court (centre)' },
  C: { id: 'C', name: 'Court C', type: 'small', format: '5v5', description: 'Small court (right)' },
  X: { id: 'X', name: 'Court X', type: 'large', format: '7v7', description: 'Large court over A + B' },
  Y: { id: 'Y', name: 'Court Y', type: 'large', format: '7v7', description: 'Large court over B + C' },
});

// Build a symmetric (undirected) adjacency map from a parent -> children definition.
// Overlap is bidirectional, so one loop handles parents, children and any layout.
export function buildAdjacency(overlaps, courts = ALL_COURTS) {
  const sets = {};
  for (const court of courts) sets[court] = new Set();

  for (const [parent, children] of Object.entries(overlaps)) {
    for (const child of children) {
      // Ignore references to courts outside the canonical list.
      if (!sets[parent] || !sets[child]) continue;
      sets[parent].add(child);
      sets[child].add(parent);
    }
  }

  const adjacency = {};
  for (const court of courts) {
    adjacency[court] = Object.freeze(courts.filter((c) => sets[court].has(c)));
  }
  return Object.freeze(adjacency);
}

// Pre-computed bidirectional adjacency for the default arena configuration.
export const ADJACENCY = buildAdjacency(OVERLAPS, ALL_COURTS);
