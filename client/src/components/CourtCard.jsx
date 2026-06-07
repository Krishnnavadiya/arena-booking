import { COURT_META } from '../logic/overlapMap.js';
import { STATUS_STYLES } from '../types/court.js';

// A single court tile: book if available, cancel if you own it, inert if blocked.
export default function CourtCard({ id, status, owner, isMine, busy, onToggle }) {
  const meta = COURT_META[id];
  const style = STATUS_STYLES[status];
  const isBooked = status === 'booked';
  const interactive = status === 'available' || (isBooked && isMine);

  return (
    <button
      type="button"
      onClick={() => interactive && onToggle(id)}
      disabled={!interactive || busy}
      aria-pressed={isBooked}
      aria-label={`${meta.name} (${meta.format}) - ${style.label}`}
      className={[
        'group relative flex w-full flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition',
        style.card,
        interactive && !busy
          ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md'
          : 'cursor-not-allowed opacity-90',
      ].join(' ')}
    >
      <div className="flex w-full items-center justify-between">
        <span className="text-lg font-bold text-slate-800">{meta.name}</span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${style.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-700">
          {meta.format}
        </span>
        <span className="capitalize">{meta.type} court</span>
      </div>

      {isBooked && owner ? (
        <p className="text-xs font-medium text-slate-600">
          Booked by{' '}
          {isMine ? (
            <span className="font-bold text-emerald-700">you</span>
          ) : (
            <span className="font-semibold text-slate-700">{owner.name}</span>
          )}
        </p>
      ) : (
        <p className="text-xs text-slate-500">{meta.description}</p>
      )}

      <span className="mt-1 text-xs font-medium text-slate-400 group-hover:text-slate-600">
        {busy
          ? 'Working…'
          : status === 'available'
            ? 'Click to book'
            : isBooked && isMine
              ? 'Click to cancel your booking'
              : isBooked
                ? 'Booked by another user'
                : 'Unavailable - overlaps a booking'}
      </span>
    </button>
  );
}
