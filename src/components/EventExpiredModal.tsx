import { X, PartyPopper } from "lucide-react";
import { useState, useEffect } from "react";

interface EventExpiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventName: string;
  endDatetime: string;
}

export default function EventExpiredModal({ isOpen, onClose, eventName, endDatetime }: EventExpiredModalProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    if (!isOpen || !endDatetime) return;

    const calculateTimeRemaining = () => {
      const endDate = new Date(endDatetime);
      const expirationDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000); // +24 hours
      const now = new Date();
      const diff = expirationDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("0h 0m 0s");
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
  }, [isOpen, endDatetime]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-soft-lg dark:shadow-soft-dark max-w-md w-full p-6 animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-primary-mint to-primary-pine rounded-button shadow-soft">
              <PartyPopper className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white font-outfit">
                Event Ended
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-outfit">
                {eventName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-primary-mint/10 to-primary-pine/10 dark:from-primary-mint/20 dark:to-primary-pine/20 rounded-button-rect border border-primary-mint/30 dark:border-primary-mint/40">
            <p className="text-center text-lg font-semibold text-primary-pine dark:text-primary-mint font-outfit mb-2">
              Thank you for attending!
            </p>
            <p className="text-center text-sm text-slate-600 dark:text-slate-300 font-outfit">
              We hope you enjoyed the event. This group will be automatically dissolved after the countdown.
            </p>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-button-rect border-2 border-amber-500 dark:border-amber-400">
            <p className="text-center text-xs font-medium text-amber-700 dark:text-amber-300 font-outfit mb-1">
              Group Dissolving In
            </p>
            <p className="text-center text-3xl font-bold text-amber-600 dark:text-amber-400 font-montserrat tabular-nums">
              {timeRemaining}
            </p>
          </div>

          <div className="pt-2">
            <p className="text-xs text-center text-slate-500 dark:text-slate-400 font-outfit">
              All members will be removed and the event will be deleted once the countdown reaches zero.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-primary hover:scale-105 text-white font-medium rounded-button-rect shadow-soft transition-all font-outfit"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
