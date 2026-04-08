import { Calendar, MapPin, Clock, Users, MessageCircle, XCircle, User, Sparkles, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { getEventStatus, type EventStatus } from "@/src/components/EventStatusBadge";
import type { Event } from "@/src/lib/types";

interface EventMessageDisplayProps {
  event: Event;
  onJoinEvent?: (eventId: number) => void;
  onGoToChat?: (eventId: number, eventName: string) => void;
}

export default function EventMessageDisplay({ event, onJoinEvent, onGoToChat }: EventMessageDisplayProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [eventStatus, setEventStatus] = useState<EventStatus>(() => getEventStatus(event.start_datetime, event.end_datetime));

  // Update status every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setEventStatus(getEventStatus(event.start_datetime, event.end_datetime));
    }, 30000);
    return () => clearInterval(interval);
  }, [event.start_datetime, event.end_datetime]);

  // Check if event is deleted (soft delete sets end_datetime to year 2000)
  // 2000-01-01 = manually deleted by creator
  // 2000-01-02 = auto-expired after grace period
  const isManuallyDeleted = event.end_datetime.startsWith('2000-01-01');
  const isAutoExpired = event.end_datetime.startsWith('2000-01-02');
  // Also treat as deleted if the event creator has been deleted
  const isCreatorDeleted = event.creator_is_deleted === 1;
  const isDeleted = isManuallyDeleted || isAutoExpired || isCreatorDeleted;
  
  // Check if creator is deactivated (but not deleted)
  const isCreatorDeactivated = event.creator_is_active === 0 && !isCreatorDeleted;
  
  // Check if event has ended (past scheduled end time)
  const hasEnded = !isDeleted && new Date(event.end_datetime) <= new Date();
  
  // Check if event has expired (ended but within 24 hour grace period) - only for joined users
  const isExpired = hasEnded && (event.is_expired === 1 || event.is_expired === true);
  
  // Check if event is full
  const isFull = (event.current_members ?? 0) >= event.max_members;

  // Calculate countdown for expired events
  useEffect(() => {
    if (!isExpired) {
      setTimeRemaining('');
      return;
    }

    const calculateTimeRemaining = () => {
      const endTime = new Date(event.end_datetime).getTime();
      const gracePeriodEnd = endTime + (24 * 60 * 60 * 1000); // 24 hours
      const now = Date.now();
      const diff = gracePeriodEnd - now;

      if (diff <= 0) {
        return '0h 0m';
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    };

    setTimeRemaining(calculateTimeRemaining());
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isExpired, event.end_datetime]);
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
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return `${duration} day${duration > 1 ? 's' : ''}`;
  };

  return (
    <div className={`max-w-[85%] sm:max-w-md backdrop-blur-xl rounded-3xl p-6 space-y-4 shadow-lg ${
      isDeleted || isCreatorDeactivated || (hasEnded && !event.is_joined)
        ? 'bg-slate-400/30 dark:bg-slate-700/30 border border-slate-400/50 dark:border-slate-600/50'
        : 'bg-gradient-to-br from-primary-mint/50 via-primary-mint/35 to-primary-pine/45 dark:bg-[linear-gradient(to_bottom_right,rgba(52,211,153,0.35)_10%,#1a2d2d_70%)] border border-primary-mint/40 dark:border-primary-mint/30 shadow-[0_0_12px_rgba(74,255,159,0.15)] dark:shadow-[0_0_8px_rgba(52,211,153,0.15)]'
    }`}>
      {/* Header - Event Name */}
      <div className={`flex items-center gap-2 ${
        isDeleted || isCreatorDeactivated || (hasEnded && !event.is_joined)
          ? 'text-slate-500 dark:text-slate-400'
          : 'text-primary-pine dark:text-primary-mint'
      }`}>
        <div className={`p-2 rounded-lg backdrop-blur-sm shadow-sm ${
          isDeleted || isCreatorDeactivated || (hasEnded && !event.is_joined)
            ? 'bg-slate-300/60 dark:bg-slate-600/60'
            : 'bg-white/30 dark:bg-primary-mint/20'
        }`}>
          {isDeleted || isCreatorDeactivated || (hasEnded && !event.is_joined) ? (
            <XCircle className="w-4 h-4" />
          ) : (
            <Calendar className="w-4 h-4" />
          )}
        </div>
        <span className="font-outfit font-bold text-lg uppercase">
          {event.name}
        </span>
      </div>


      {/* Status Label for deleted/expired events */}
      {(isDeleted || isCreatorDeactivated || (hasEnded && !event.is_joined)) && (
        <div className="text-sm font-outfit text-slate-500 dark:text-slate-400">
          {isManuallyDeleted || isCreatorDeleted ? 'Event Deleted' : isCreatorDeactivated ? 'Creator Deactivated' : 'Event Expired'}
        </div>
      )}

      {/* Event Creator */}
      {event.creator_name && (
        <div className={`flex items-center gap-2 ${
          isDeleted || isCreatorDeactivated || (hasEnded && !event.is_joined)
            ? 'text-slate-500 dark:text-slate-500'
            : 'text-primary-pine/80 dark:text-slate-300'
        }`}>
          <User className="w-3.5 h-3.5" />
          <span className="font-outfit text-sm">Created by {event.creator_name}{isCreatorDeactivated ? ' (Deactivated)' : ''}</span>
        </div>
      )}

      {/* Event Image */}
      {event.image_url && !isDeleted && !isCreatorDeactivated && !(hasEnded && !event.is_joined) && (
        <div className="rounded-2xl overflow-hidden border-2 border-white/60 dark:border-primary-mint/20 shadow-md">
          <img 
            src={event.image_url} 
            alt={event.name}
            className="w-full h-40 object-cover"
          />
        </div>
      )}

      {/* Event Details */}
      <div className="space-y-3">
        {/* Start */}
        <div className="flex items-start gap-3">
          <Calendar className={`w-4 h-4 flex-shrink-0 mt-0.5 drop-shadow-sm ${
            isDeleted || isCreatorDeactivated || (hasEnded && !event.is_joined)
              ? 'text-slate-500 dark:text-slate-400'
              : 'text-primary-pine dark:text-primary-mint'
          }`} />
          <div>
            <p className={`font-outfit font-semibold text-sm ${
              isDeleted || isCreatorDeactivated || (hasEnded && !event.is_joined)
                ? 'text-slate-600 dark:text-slate-400'
                : 'text-primary-pine dark:text-white'
            }`}>Start</p>
            <p className={`font-outfit text-sm ${
              isDeleted || isCreatorDeactivated || (hasEnded && !event.is_joined)
                ? 'text-slate-500 dark:text-slate-500'
                : 'text-primary-pine/70 dark:text-slate-300'
            }`}>
              {formatEventDate(event.start_datetime)} at {formatEventTime(event.start_datetime)}
            </p>
          </div>
        </div>

        {/* End */}
        <div className="flex items-start gap-3">
          <Calendar className={`w-4 h-4 flex-shrink-0 mt-0.5 drop-shadow-sm ${
            isDeleted || isCreatorDeactivated || (hasEnded && !event.is_joined)
              ? 'text-slate-500 dark:text-slate-400'
              : 'text-primary-pine dark:text-primary-mint'
          }`} />
          <div>
            <p className={`font-outfit font-semibold text-sm ${
              isDeleted || isCreatorDeactivated || (hasEnded && !event.is_joined)
                ? 'text-slate-600 dark:text-slate-400'
                : 'text-primary-pine dark:text-white'
            }`}>End</p>
            <p className={`font-outfit text-sm ${
              isDeleted || isCreatorDeactivated || (hasEnded && !event.is_joined)
                ? 'text-slate-500 dark:text-slate-500'
                : 'text-primary-pine/70 dark:text-slate-300'
            }`}>
              {formatEventDate(event.end_datetime)} at {formatEventTime(event.end_datetime)}
            </p>
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-start gap-3">
          <Clock className={`w-4 h-4 flex-shrink-0 mt-0.5 drop-shadow-sm ${
            isDeleted || isCreatorDeactivated || (hasEnded && !event.is_joined)
              ? 'text-slate-500 dark:text-slate-400'
              : 'text-primary-pine dark:text-primary-mint'
          }`} />
          <div>
            <p className={`font-outfit font-semibold text-sm ${
              isDeleted || isCreatorDeactivated || (hasEnded && !event.is_joined)
                ? 'text-slate-600 dark:text-slate-400'
                : 'text-primary-pine dark:text-white'
            }`}>Duration</p>
            <p className={`font-outfit text-sm ${
              isDeleted || isCreatorDeactivated || (hasEnded && !event.is_joined)
                ? 'text-slate-500 dark:text-slate-500'
                : 'text-primary-pine/70 dark:text-slate-300'
            }`}>
              {calculateDuration(event.start_datetime, event.end_datetime)}
            </p>
          </div>
        </div>

        {/* Location - only show if event has location */}
        {event.location && (
          <div className="flex items-start gap-3">
            <MapPin className={`w-4 h-4 flex-shrink-0 mt-0.5 drop-shadow-sm ${
              isDeleted || isCreatorDeactivated || (hasEnded && !event.is_joined)
                ? 'text-slate-500 dark:text-slate-400'
                : 'text-primary-pine dark:text-primary-mint'
            }`} />
            <div>
              <p className={`font-outfit font-semibold text-sm ${
                isDeleted || isCreatorDeactivated || (hasEnded && !event.is_joined)
                  ? 'text-slate-600 dark:text-slate-400'
                  : 'text-primary-pine dark:text-white'
              }`}>Location</p>
              <p className={`font-outfit text-sm ${
                isDeleted || isCreatorDeactivated || (hasEnded && !event.is_joined)
                  ? 'text-slate-500 dark:text-slate-500'
                  : 'text-primary-pine/70 dark:text-slate-300'
              }`}>
                {event.location}
              </p>
            </div>
          </div>
        )}

        {/* Attendees */}
        <div className="flex items-start gap-3">
          <Users className={`w-4 h-4 flex-shrink-0 mt-0.5 drop-shadow-sm ${
            isDeleted || isCreatorDeactivated || (hasEnded && !event.is_joined)
              ? 'text-slate-500 dark:text-slate-400'
              : 'text-primary-pine dark:text-primary-mint'
          }`} />
          <div>
            <p className={`font-outfit font-semibold text-sm ${
              isDeleted || isCreatorDeactivated || (hasEnded && !event.is_joined)
                ? 'text-slate-600 dark:text-slate-400'
                : 'text-primary-pine dark:text-white'
            }`}>Attendees</p>
            <p className={`font-outfit text-sm ${
              isDeleted || isCreatorDeactivated || (hasEnded && !event.is_joined)
                ? 'text-slate-500 dark:text-slate-500'
                : 'text-primary-pine/70 dark:text-slate-300'
            }`}>
              {event.current_members} / {event.max_members} members
            </p>
          </div>
        </div>
      </div>

      {/* Action Button */}
      {isManuallyDeleted || isCreatorDeleted ? (
        <button 
          disabled
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-400 dark:bg-slate-600 text-slate-200 dark:text-slate-400 rounded-button-rect font-outfit font-bold text-sm cursor-not-allowed"
        >
          Event Deleted
        </button>
      ) : isCreatorDeactivated ? (
        <button 
          disabled
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-400 dark:bg-slate-600 text-slate-200 dark:text-slate-400 rounded-button-rect font-outfit font-bold text-sm cursor-not-allowed"
        >
          Creator Deactivated
        </button>
      ) : isAutoExpired ? (
        <button 
          disabled
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-400 dark:bg-slate-600 text-slate-200 dark:text-slate-400 rounded-button-rect font-outfit font-bold text-sm cursor-not-allowed"
        >
          Event Expired
        </button>
      ) : hasEnded && !event.is_joined ? (
        // Non-joined users see expired state immediately when event ends
        <button 
          disabled
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-400 dark:bg-slate-600 text-slate-200 dark:text-slate-400 rounded-button-rect font-outfit font-bold text-sm cursor-not-allowed"
        >
          Event Expired
        </button>
      ) : isExpired && event.is_joined ? (
        // Joined users see countdown during 24-hour grace period
        <div className="space-y-2">
          <button 
            onClick={() => onGoToChat?.(event.id, event.name)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-mint to-primary-pine hover:opacity-90 text-white rounded-button-rect font-outfit font-bold text-sm transition-opacity"
          >
            <MessageCircle className="w-4 h-4" />
            Go to Chat
          </button>
          <div className="w-full flex flex-col items-center gap-1 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 dark:from-amber-500/30 dark:to-orange-500/30 border-2 border-amber-500 dark:border-amber-400 rounded-button-rect animate-pulse">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 font-outfit">
                Dissolving in {timeRemaining}
              </span>
            </div>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-outfit">
              All messages & attachments will be deleted
            </span>
          </div>
        </div>
      ) : event.is_joined ? (
        <div className="space-y-2">
          <button 
            onClick={() => onGoToChat?.(event.id, event.name)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-mint to-primary-pine hover:opacity-90 text-white rounded-button-rect font-outfit font-bold text-sm transition-opacity"
          >
            <MessageCircle className="w-4 h-4" />
            Go to Chat
          </button>
          {eventStatus === 'upcoming' && (
            <div className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 dark:from-cyan-500/30 dark:to-teal-500/30 border-2 border-cyan-500 dark:border-cyan-400 rounded-button-rect">
              <Sparkles className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
              <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 font-outfit">
                Upcoming · Hurry up
              </span>
            </div>
          )}
          {eventStatus === 'live' && (
            <div className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 dark:from-emerald-500/30 dark:to-emerald-600/30 border-2 border-emerald-500 dark:border-emerald-400 rounded-button-rect">
              <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 font-outfit">
                Live · Enjoy
              </span>
            </div>
          )}
        </div>
      ) : isFull ? (
        <button 
          disabled
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-400 dark:bg-slate-600 text-slate-200 dark:text-slate-400 rounded-button-rect font-outfit font-bold text-sm cursor-not-allowed"
        >
          House Full
        </button>
      ) : (
        <div className="space-y-2">
          <button 
            onClick={() => onJoinEvent?.(event.id)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-mint to-primary-pine hover:opacity-90 text-white rounded-button-rect font-outfit font-bold text-sm transition-opacity"
          >
            Join Event
          </button>
          {eventStatus === 'upcoming' && (
            <div className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 dark:from-cyan-500/30 dark:to-teal-500/30 border-2 border-cyan-500 dark:border-cyan-400 rounded-button-rect">
              <Sparkles className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
              <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 font-outfit">
                Upcoming · Hurry up
              </span>
            </div>
          )}
          {eventStatus === 'live' && (
            <div className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 dark:from-emerald-500/30 dark:to-emerald-600/30 border-2 border-emerald-500 dark:border-emerald-400 rounded-button-rect">
              <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 font-outfit">
                Live · Enjoy
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
