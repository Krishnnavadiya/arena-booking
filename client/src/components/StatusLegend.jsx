import { STATUS_STYLES } from '../types/court.js';

// Colour legend: Green = Available, Red = Booked, Orange = Blocked.
export default function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
      {Object.values(STATUS_STYLES).map((style) => (
        <span key={style.label} className="flex items-center gap-1.5">
          <span className={`h-3 w-3 rounded-full ${style.dot}`} />
          {style.label}
        </span>
      ))}
    </div>
  );
}
