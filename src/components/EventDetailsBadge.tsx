import { Calendar, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { getEventStatus } from "@/src/components/EventStatusBadge";

interface EventDetailsBadgeProps {
  onClick: () => void;
  isExpired?: boolean;
  endDatetime?: string;
  startDatetime?: string;
}

export default function EventDetailsBadge({ onClick, isExpired, endDatetime, startDatetime }: EventDetailsBadgeProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [eventStatus, setEventStatus] = useState<"upcoming" | "live" | "ended">("upcoming");

  useEffect(() => {
    if (startDatetime && endDatetime) {
      const updateStatus = () => {
        setEventStatus(getEventStatus(startDatetime, endDatetime));
      };
      updateStatus();
      const interval = setInterval(updateStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [startDatetime, endDatetime]);

  useEffect(() => {
    if (!isExpired || !endDatetime) return;

    const calculateTimeRemaining = () => {
      const endDate = new Date(endDatetime);
      const expirationDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000); // +24 hours
      const now = new Date();
      const diff = expirationDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Expired");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [isExpired, endDatetime]);

  // Ended/Dissolving state (amber)
  if (isExpired) {
    return (
      <button
        onClick={onClick}
        className="inline-flex flex-col items-center gap-1 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 dark:from-amber-500/30 dark:to-orange-500/30 border-2 border-amber-500 dark:border-amber-400 rounded-button-rect hover:from-amber-500/30 hover:to-orange-500/30 dark:hover:from-amber-500/40 dark:hover:to-orange-500/40 transition-colors animate-pulse"
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="text-sm font-semibold text-amber-700 dark:text-amber-300 font-outfit">
            Event Ended • Dissolving in {timeRemaining}
          </span>
        </div>
        <span className="text-xs text-amber-600 dark:text-amber-400 font-outfit">
          All messages & attachments will be deleted
        </span>
      </button>
    );
  }

  // Live state (emerald green)
  if (eventStatus === 'live') {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 dark:from-emerald-500/30 dark:to-emerald-600/30 border-2 border-emerald-500 dark:border-emerald-400 rounded-button-rect hover:from-emerald-500/30 hover:to-emerald-600/30 dark:hover:from-emerald-500/40 dark:hover:to-emerald-600/40 transition-colors"
      >
        <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 font-outfit">
          Event Details • Live
        </span>
      </button>
    );
  }

  // Upcoming state (cyan/teal)
  if (eventStatus === 'upcoming') {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 dark:from-cyan-500/30 dark:to-teal-500/30 border-2 border-cyan-500 dark:border-cyan-400 rounded-button-rect hover:from-cyan-500/30 hover:to-teal-500/30 dark:hover:from-cyan-500/40 dark:hover:to-teal-500/40 transition-colors"
      >
        <Calendar className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
        <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300 font-outfit">
          Event Details • Upcoming
        </span>
      </button>
    );
  }

  // Default fallback
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-button-rect hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors"
    >
      <Calendar className="w-4 h-4 text-slate-500 dark:text-slate-400" />
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300 font-outfit">
        Event Details
      </span>
    </button>
  );
}
