import { useState, useEffect } from "react";

type EventStatus = "upcoming" | "live" | "ended";

interface EventStatusBadgeProps {
  startDatetime: string;
  endDatetime: string;
  className?: string;
}

function getEventStatus(startDatetime: string, endDatetime: string): EventStatus {
  const now = new Date();
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);

  if (now < start) {
    return "upcoming";
  } else if (now >= start && now <= end) {
    return "live";
  } else {
    return "ended";
  }
}

export default function EventStatusBadge({ startDatetime, endDatetime, className = "" }: EventStatusBadgeProps) {
  const [status, setStatus] = useState<EventStatus>(() => getEventStatus(startDatetime, endDatetime));

  // Update status every 30 seconds to catch transitions
  useEffect(() => {
    const updateStatus = () => {
      setStatus(getEventStatus(startDatetime, endDatetime));
    };

    const interval = setInterval(updateStatus, 30000);
    return () => clearInterval(interval);
  }, [startDatetime, endDatetime]);

  const statusConfig = {
    upcoming: {
      label: "Upcoming · Hurry up",
      bgLight: "bg-amber-100",
      bgDark: "dark:bg-amber-900/40",
      textLight: "text-amber-700",
      textDark: "dark:text-amber-300",
      borderLight: "border-amber-300",
      borderDark: "dark:border-amber-600",
    },
    live: {
      label: "Live · Enjoy",
      bgLight: "bg-emerald-100",
      bgDark: "dark:bg-emerald-900/40",
      textLight: "text-emerald-700",
      textDark: "dark:text-emerald-300",
      borderLight: "border-emerald-300",
      borderDark: "dark:border-emerald-600",
    },
    ended: {
      label: "✓ Successfully Ended",
      bgLight: "bg-emerald-50",
      bgDark: "dark:bg-emerald-900/20",
      textLight: "text-emerald-700",
      textDark: "dark:text-emerald-400",
      borderLight: "border-emerald-200",
      borderDark: "dark:border-emerald-700",
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold font-outfit border ${config.bgLight} ${config.bgDark} ${config.textLight} ${config.textDark} ${config.borderLight} ${config.borderDark} ${className}`}
    >
      {config.label}
    </span>
  );
}

// Export helper for checking status in other components
export { getEventStatus };
export type { EventStatus };
