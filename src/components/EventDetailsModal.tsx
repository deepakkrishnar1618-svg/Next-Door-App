import { Calendar, MapPin, Clock, Users, X } from "lucide-react";

interface EventDetails {
  name: string;
  description: string | null;
  location?: string | null;
  start_datetime: string;
  end_datetime: string;
  max_members: number;
  image_url: string | null;
}

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventDetails: EventDetails | null;
}

export default function EventDetailsModal({ isOpen, onClose, eventDetails }: EventDetailsModalProps) {
  if (!isOpen || !eventDetails) return null;

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatEventTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      const remainingHours = diffHours % 24;
      if (remainingHours > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''}, ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
      }
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    }
    return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-white dark:bg-dark-ocean rounded-3xl shadow-xl dark:shadow-soft-dark border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto animate-scale-in" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-dark-ocean/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between rounded-t-3xl z-10">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white font-outfit">Event Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-button-rect transition-colors"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Event Image */}
          {eventDetails.image_url && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
              <img 
                src={eventDetails.image_url} 
                alt={eventDetails.name}
                className="w-full h-48 object-cover"
              />
            </div>
          )}

          {/* Event Name */}
          <div>
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
              <Calendar className="w-3 h-3" />
              <span className="text-[10px] font-semibold uppercase font-outfit">Event Name</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white font-outfit">
              {eventDetails.name}
            </h3>
          </div>

          {/* Description */}
          {eventDetails.description && (
            <div>
              <p className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1 font-outfit">Description</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 font-outfit leading-relaxed">
                {eventDetails.description}
              </p>
            </div>
          )}

          {/* Date, Time & Duration Section */}
          <div className="grid grid-cols-3 gap-3">
            {/* Start */}
            <div>
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                <Calendar className="w-3 h-3" />
                <span className="text-[10px] font-semibold uppercase font-outfit">Start</span>
              </div>
              <p className="text-sm font-medium text-slate-800 dark:text-white font-outfit">
                {formatEventDate(eventDetails.start_datetime)}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-outfit">
                {formatEventTime(eventDetails.start_datetime)}
              </p>
            </div>

            {/* End */}
            <div>
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                <Calendar className="w-3 h-3" />
                <span className="text-[10px] font-semibold uppercase font-outfit">End</span>
              </div>
              <p className="text-sm font-medium text-slate-800 dark:text-white font-outfit">
                {formatEventDate(eventDetails.end_datetime)}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-outfit">
                {formatEventTime(eventDetails.end_datetime)}
              </p>
            </div>

            {/* Duration */}
            <div>
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                <Clock className="w-3 h-3" />
                <span className="text-[10px] font-semibold uppercase font-outfit">Duration</span>
              </div>
              <p className="text-sm font-medium text-slate-800 dark:text-white font-outfit">
                {calculateDuration(eventDetails.start_datetime, eventDetails.end_datetime)}
              </p>
            </div>
          </div>

          {/* Location */}
          {eventDetails.location && eventDetails.location.trim() !== '' && (
            <div>
              <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
                <MapPin className="w-3 h-3" />
                <span className="text-[10px] font-semibold uppercase font-outfit">Location</span>
              </div>
              <p className="text-sm font-medium text-slate-800 dark:text-white font-outfit">
                {eventDetails.location}
              </p>
            </div>
          )}

          {/* Max Members */}
          <div>
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
              <Users className="w-3 h-3" />
              <span className="text-[10px] font-semibold uppercase font-outfit">Maximum Members</span>
            </div>
            <p className="text-sm font-medium text-slate-800 dark:text-white font-outfit">
              {eventDetails.max_members} members
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
