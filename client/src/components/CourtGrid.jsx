import { ALL_COURTS } from '../logic/overlapMap.js';
import CourtCard from './CourtCard.jsx';

// Renders every court as a card grid, driven by the shared arena state.
export default function CourtGrid({ statuses, bookedBy, currentUserId, busyCourt, onToggle }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ALL_COURTS.map((id) => {
        const owner = bookedBy?.[id] || null;
        return (
          <CourtCard
            key={id}
            id={id}
            status={statuses[id]}
            owner={owner}
            isMine={!!owner && owner.userId === currentUserId}
            busy={busyCourt === id}
            onToggle={onToggle}
          />
        );
      })}
    </div>
  );
}
