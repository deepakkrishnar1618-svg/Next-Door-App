import { Package } from "lucide-react";

interface ListingDetailsBadgeProps {
  onClick: () => void;
  type: 'offering' | 'requesting';
  status: string;
}

export default function ListingDetailsBadge({ onClick, type, status }: ListingDetailsBadgeProps) {
  // Get status display text
  const getStatusText = () => {
    switch (status) {
      case 'open': return 'Open';
      case 'discussion': return 'In Discussion';
      case 'confirmed': return 'Deal Confirmed';
      case 'closed': return 'Closed';
      default: return status;
    }
  };

  // Closed status (gray)
  if (status === 'closed') {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-500/20 to-slate-600/20 dark:from-slate-500/30 dark:to-slate-600/30 border-2 border-slate-400 dark:border-slate-500 rounded-button-rect hover:from-slate-500/30 hover:to-slate-600/30 dark:hover:from-slate-500/40 dark:hover:to-slate-600/40 transition-colors"
      >
        <Package className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 font-outfit">
          {type === 'offering' ? 'Offering' : 'Requesting'} Details • {getStatusText()}
        </span>
      </button>
    );
  }

  // Deal Confirmed (emerald green)
  if (status === 'confirmed') {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 dark:from-emerald-500/30 dark:to-emerald-600/30 border-2 border-emerald-500 dark:border-emerald-400 rounded-button-rect hover:from-emerald-500/30 hover:to-emerald-600/30 dark:hover:from-emerald-500/40 dark:hover:to-emerald-600/40 transition-colors"
      >
        <Package className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 font-outfit">
          {type === 'offering' ? 'Offering' : 'Requesting'} Details • {getStatusText()}
        </span>
      </button>
    );
  }

  // In Discussion (amber)
  if (status === 'discussion') {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 dark:from-amber-500/30 dark:to-orange-500/30 border-2 border-amber-500 dark:border-amber-400 rounded-button-rect hover:from-amber-500/30 hover:to-orange-500/30 dark:hover:from-amber-500/40 dark:hover:to-orange-500/40 transition-colors"
      >
        <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-semibold text-amber-700 dark:text-amber-300 font-outfit">
          {type === 'offering' ? 'Offering' : 'Requesting'} Details • {getStatusText()}
        </span>
      </button>
    );
  }

  // Open status (cyan/teal - default)
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 dark:from-cyan-500/30 dark:to-teal-500/30 border-2 border-cyan-500 dark:border-cyan-400 rounded-button-rect hover:from-cyan-500/30 hover:to-teal-500/30 dark:hover:from-cyan-500/40 dark:hover:to-teal-500/40 transition-colors"
    >
      <Package className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
      <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300 font-outfit">
        {type === 'offering' ? 'Offering' : 'Requesting'} Details • {getStatusText()}
      </span>
    </button>
  );
}
