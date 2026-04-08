import { Pin } from "lucide-react";

interface PinnedMessageBadgeProps {
  count: number;
  onClick: () => void;
}

export default function PinnedMessageBadge({ count, onClick }: PinnedMessageBadgeProps) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-button-rect hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors"
    >
      <Pin className="w-4 h-4 text-slate-500 dark:text-slate-400" />
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 font-outfit">
        {count} {count === 1 ? 'pinned message' : 'pinned messages'}
      </span>
    </button>
  );
}
