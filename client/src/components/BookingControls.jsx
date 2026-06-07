import { ALL_COURTS, COURT_META } from '../logic/overlapMap.js';

// Quick toggle buttons: your booking is highlighted; others' / blocked are disabled.
export default function BookingControls({ statuses, bookedBy, currentUserId, busyCourt, onToggle }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Booking Controls
      </h2>

      <div className="flex flex-wrap gap-2">
        {ALL_COURTS.map((id) => {
          const status = statuses[id];
          const owner = bookedBy?.[id];
          const mine = owner && owner.userId === currentUserId;
          const busy = busyCourt === id;
          const interactive = status === 'available' || (status === 'booked' && mine);

          let cls = 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50';
          if (status === 'booked' && mine) cls = 'border-emerald-500 bg-emerald-500 text-white';
          else if (status === 'booked') cls = 'border-red-200 bg-red-50 text-red-400';
          else if (status === 'blocked') cls = 'border-orange-200 bg-orange-50 text-orange-400';

          return (
            <button
              key={id}
              type="button"
              onClick={() => interactive && onToggle(id)}
              disabled={!interactive || busy}
              title={
                status === 'booked' && !mine
                  ? `Booked by ${owner?.name}`
                  : status === 'blocked'
                    ? 'Blocked by overlap'
                    : ''
              }
              className={[
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition',
                cls,
                interactive && !busy ? 'cursor-pointer' : 'cursor-not-allowed',
              ].join(' ')}
            >
              <span className="font-mono font-bold">{id}</span>
              <span className="text-xs opacity-80">{COURT_META[id].format}</span>
              {busy && <span className="text-xs">…</span>}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Green = your booking · click to cancel. Greyed = booked by someone else or blocked.
      </p>
    </div>
  );
}
