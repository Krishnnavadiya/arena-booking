// Status colour styling for the UI. Green = Available, Red = Booked, Orange = Blocked.
export const STATUS_STYLES = {
  available: {
    label: 'Available',
    badge: 'bg-green-100 text-green-800 ring-green-600/20',
    card: 'border-green-300 bg-green-50 hover:bg-green-100',
    dot: 'bg-green-500',
  },
  booked: {
    label: 'Booked',
    badge: 'bg-red-100 text-red-800 ring-red-600/20',
    card: 'border-red-300 bg-red-50',
    dot: 'bg-red-500',
  },
  blocked: {
    label: 'Blocked',
    badge: 'bg-orange-100 text-orange-800 ring-orange-600/20',
    card: 'border-orange-300 bg-orange-50',
    dot: 'bg-orange-500',
  },
};
