import { useState, useEffect } from 'react';
import { X, Calendar, MapPin, Users, Clock, User, Trash2 } from 'lucide-react';
import { formatDistanceToNow, format, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';

interface EventHistory {
  id: number;
  event_id: number;
  name: string;
  description: string;
  location: string;
  start_datetime: string;
  end_datetime: string;
  max_members: number;
  image_url: string | null;
  creator_user_id: string;
  creator_name: string;
  creator_room: string | null;
  total_attendees: number;
  is_deleted: number;
  ended_at: string;
}

interface EventHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatDuration(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const minutes = differenceInMinutes(endDate, startDate);
  const hours = differenceInHours(endDate, startDate);
  const days = differenceInDays(endDate, startDate);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}

export default function EventHistoryPanel({ isOpen, onClose }: EventHistoryPanelProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [allHistory, setAllHistory] = useState<EventHistory[]>([]);
  const [myHistory, setMyHistory] = useState<EventHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const [allRes, myRes] = await Promise.all([
        fetch('/api/events/history'),
        fetch('/api/events/history/my')
      ]);
      
      if (allRes.ok) {
        const data = await allRes.json();
        setAllHistory(data);
      }
      
      if (myRes.ok) {
        const data = await myRes.json();
        setMyHistory(data);
      }
    } catch (error) {
      console.error('Error fetching event history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const displayHistory = activeTab === 'all' ? allHistory : myHistory;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-dark-ocean">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-dark-ocean border-b border-slate-200 dark:border-slate-700 px-xl py-m z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-nura">Event History</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-dark-elevated rounded-button-rect transition-all hover:scale-105"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Tabs - 50% width each with underline indicator */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-3 text-center font-outfit font-medium text-sm transition-colors relative ${
            activeTab === 'all'
              ? 'text-primary-pine dark:text-primary-mint'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          All Events
          {activeTab === 'all' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-mint" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`flex-1 py-3 text-center font-outfit font-medium text-sm transition-colors relative ${
            activeTab === 'my'
              ? 'text-primary-pine dark:text-primary-mint'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          My Events
          {activeTab === 'my' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-mint" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-xl py-m space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-mint/30 border-t-primary-mint rounded-full animate-spin" />
          </div>
        ) : displayHistory.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-outfit">{activeTab === 'all' ? 'No past events yet' : 'No events you created or attended'}</p>
          </div>
        ) : (
          displayHistory.map((event) => (
            <div
              key={event.id}
              className={`rounded-2xl overflow-hidden ${
                event.is_deleted
                  ? 'bg-slate-100 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-600'
                  : 'bg-slate-50 dark:bg-dark-elevated'
              }`}
            >
              {/* Event Image */}
              {event.image_url && (
                <div className="relative h-24 overflow-hidden">
                  <img
                    src={event.image_url}
                    alt={event.name}
                    className={`w-full h-full object-cover ${event.is_deleted ? 'opacity-50 grayscale' : ''}`}
                  />
                  {event.is_deleted && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-red-500/90 text-white text-xs font-medium rounded-lg flex items-center gap-1">
                      <Trash2 className="w-3 h-3" />
                      Deleted
                    </div>
                  )}
                </div>
              )}

              {/* Event Details */}
              <div className={`p-3 ${event.is_deleted ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className={`font-semibold text-sm font-outfit ${
                    event.is_deleted 
                      ? 'text-slate-500 dark:text-slate-400' 
                      : 'text-slate-900 dark:text-white'
                  }`}>
                    {event.name}
                  </h3>
                  {!event.image_url && event.is_deleted && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium rounded-lg flex items-center gap-1 shrink-0">
                      <Trash2 className="w-3 h-3" />
                      Deleted
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <User className="w-3 h-3" />
                    <span className="truncate font-outfit">
                      {event.creator_name}
                      {event.creator_room && ` · ${event.creator_room}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Users className="w-3 h-3" />
                    <span className="font-outfit">{event.total_attendees} attendee{event.total_attendees !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Calendar className="w-3 h-3" />
                    <span className="font-outfit">{format(new Date(event.start_datetime), 'MMM d, yyyy')}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span className="font-outfit">{formatDuration(event.start_datetime, event.end_datetime)}</span>
                  </div>

                  {event.location && (
                    <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 col-span-2">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate font-outfit">{event.location}</span>
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-500 font-outfit">
                    Ended {formatDistanceToNow(new Date(event.ended_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}