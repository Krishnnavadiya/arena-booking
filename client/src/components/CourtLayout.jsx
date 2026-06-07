import { STATUS_STYLES } from '../types/court.js';

// Visual turf: large courts (X, Y) drawn over the small courts (A, B, C) so the
// physical overlap is obvious. Each tile is colour-coded and clickable.
export default function CourtLayout({ statuses, onToggle }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Physical Turf Layout
      </h2>

      <div className="rounded-lg bg-emerald-900/90 p-3">
        <div className="mb-2 grid grid-cols-6 gap-2">
          <LayoutTile id="X" status={statuses.X} onToggle={onToggle} className="col-span-4" />
          <LayoutTile id="Y" status={statuses.Y} onToggle={onToggle} className="col-span-4 col-start-3" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <LayoutTile id="A" status={statuses.A} onToggle={onToggle} />
          <LayoutTile id="B" status={statuses.B} onToggle={onToggle} />
          <LayoutTile id="C" status={statuses.C} onToggle={onToggle} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        X (7v7) lies over A + B &middot; Y (7v7) lies over B + C. Booking any tile lights up the
        courts it physically blocks.
      </p>
    </div>
  );
}

function LayoutTile({ id, status, onToggle, className = '' }) {
  const style = STATUS_STYLES[status];
  const isBlocked = status === 'blocked';
  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      disabled={isBlocked}
      title={`Court ${id} - ${style.label}`}
      className={[
        'flex h-16 items-center justify-center rounded-md border-2 text-lg font-extrabold transition',
        style.card,
        isBlocked ? 'cursor-not-allowed' : 'cursor-pointer hover:brightness-105',
        className,
      ].join(' ')}
    >
      <span className="text-slate-800">{id}</span>
    </button>
  );
}
