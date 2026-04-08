import { useState, useEffect } from "react";
import { X, Calendar, Clock, Users, Image as ImageIcon, Trash2, MessageCircle, Check, LogOut, MapPin, Sparkles, Zap } from "lucide-react";
import { EventListSkeleton } from "@/src/components/Skeletons";
import { getEventStatus } from "@/src/components/EventStatusBadge";
import type { Event } from "@/src/lib/types";
type Tab = "upcoming" | "my-events" | "create";
interface EventPanelProps {
  onClose: () => void;
  initialTab?: Tab;
  onEventJoined?: () => void;
  onGoToEventChat?: (eventId: number, eventName: string) => void;
}
export default function EventPanel({
  onClose,
  initialTab = "create",
  onEventJoined,
  onGoToEventChat
}: EventPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  // Form state for Create tab
  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Events state
  const [myEvents, setMyEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [eventUnreadCounts, setEventUnreadCounts] = useState<Record<number, number>>({});

  // Delete confirmation state
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Leave confirmation state
  const [leavingEventId, setLeavingEventId] = useState<number | null>(null);

  // Countdown state - track countdowns for all expired events
  const [countdowns, setCountdowns] = useState<Record<number, string>>({});

  // Fetch events on mount and tab change
  useEffect(() => {
    if (activeTab === "my-events") {
      fetchMyEvents();
    } else if (activeTab === "upcoming") {
      fetchUpcomingEvents();
    }
  }, [activeTab]);

  // Poll unread counts for My Events tab
  useEffect(() => {
    if (activeTab !== "my-events" || myEvents.length === 0) return;

    // Initial fetch
    fetchUnreadCounts(myEvents);

    // Poll every 3 seconds
    const interval = setInterval(() => {
      fetchUnreadCounts(myEvents);
    }, 3000);
    return () => clearInterval(interval);
  }, [activeTab, myEvents]);

  // Calculate countdown for expired events
  useEffect(() => {
    const calculateCountdown = (endDatetime: string): string => {
      const endTime = new Date(endDatetime).getTime();
      const gracePeriodEnd = endTime + 24 * 60 * 60 * 1000; // 24 hours
      const now = Date.now();
      const diff = gracePeriodEnd - now;
      if (diff <= 0) {
        return '0h 0m';
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor(diff % (1000 * 60 * 60) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    };
    const updateCountdowns = () => {
      const newCountdowns: Record<number, string> = {};

      // Calculate for My Events
      myEvents.forEach(event => {
        if (event.is_expired === 1 || event.is_expired === true) {
          newCountdowns[event.id] = calculateCountdown(event.end_datetime);
        }
      });

      // Calculate for Upcoming Events
      upcomingEvents.forEach(event => {
        if (event.is_expired === 1 || event.is_expired === true) {
          newCountdowns[event.id] = calculateCountdown(event.end_datetime);
        }
      });
      setCountdowns(newCountdowns);
    };
    updateCountdowns();
    const interval = setInterval(updateCountdowns, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [myEvents, upcomingEvents]);
  const fetchMyEvents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/events/my", {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();

        // Defensive check: ensure we always set an array
        if (data && Array.isArray(data.events)) {
          setMyEvents(data.events);
        } else if (Array.isArray(data)) {
          setMyEvents(data);
        } else {
          console.error("Invalid response format from /api/events/my:", data);
          setMyEvents([]);
        }
      } else {
        setMyEvents([]);
      }
    } catch (error) {
      console.error("Error fetching my events:", error);
      setMyEvents([]);
    } finally {
      setIsLoading(false);
    }
  };
  const fetchUnreadCounts = async (events: Event[]) => {
    const counts: Record<number, number> = {};
    for (const event of events) {
      try {
        const response = await fetch(`/api/events/${event.id}/messages/unread/count`, {
          credentials: "include"
        });
        if (response.ok) {
          const data = await response.json();
          counts[event.id] = data.count || 0;
        }
      } catch (error) {
        console.error(`Error fetching unread count for event ${event.id}:`, error);
      }
    }
    setEventUnreadCounts(counts);
  };
  const fetchUpcomingEvents = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/events", {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();

        // Defensive check: ensure we always set an array
        if (data && Array.isArray(data.events)) {
          setUpcomingEvents(data.events);
        } else if (Array.isArray(data)) {
          setUpcomingEvents(data);
        } else {
          console.error("Invalid response format from /api/events:", data);
          setUpcomingEvents([]);
        }
      } else {
        setUpcomingEvents([]);
      }
    } catch (error) {
      console.error("Error fetching upcoming events:", error);
      setUpcomingEvents([]);
    } finally {
      setIsLoading(false);
    }
  };
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEventImage(file);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "event");
      const response = await fetch("/api/files", {
        method: "POST",
        body: formData,
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setImageUrl(data.url);
      } else {
        alert("Failed to upload image");
        setEventImage(null);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image");
      setEventImage(null);
    } finally {
      setIsUploading(false);
    }
  };
  const isFormValid = () => {
    if (!eventName.trim()) return false;
    if (!eventLocation.trim()) return false;
    if (!startDate || !startTime) return false;
    if (!endDate || !endTime) return false;
    if (!maxMembers || parseInt(maxMembers) < 1 || parseInt(maxMembers) > 50) return false;

    // Validate dates
    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    const now = new Date();
    if (start <= now) return false;
    if (end <= start) return false;

    // Check 1 month limit
    const oneMonthFromNow = new Date(now);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    if (start > oneMonthFromNow) return false;

    // Check 5 day duration
    const durationMs = end.getTime() - start.getTime();
    const durationDays = durationMs / (1000 * 60 * 60 * 24);
    if (durationDays > 5) return false;
    return true;
  };
  const handleCreateEvent = async () => {
    if (!isFormValid()) {
      alert("Please fill in all required fields correctly");
      return;
    }
    setIsCreating(true);
    try {
      const startDatetime = `${startDate}T${startTime}:00.000Z`;
      const endDatetime = `${endDate}T${endTime}:00.000Z`;
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          name: eventName,
          description: eventDescription || undefined,
          location: eventLocation,
          start_datetime: startDatetime,
          end_datetime: endDatetime,
          max_members: parseInt(maxMembers),
          image_url: imageUrl || undefined
        })
      });
      if (response.ok) {
        alert("Event created successfully!");
        // Reset form
        setEventName("");
        setEventDescription("");
        setStartDate("");
        setStartTime("");
        setEndDate("");
        setEndTime("");
        setMaxMembers("");
        setEventLocation("");
        setEventImage(null);
        setImageUrl("");
        // Switch to My Events tab
        setActiveTab("my-events");
        fetchMyEvents();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create event");
      }
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Failed to create event");
    } finally {
      setIsCreating(false);
    }
  };
  const handleDeleteEvent = async (eventId: number) => {
    if (deleteConfirmText !== "Confirm") {
      alert('Type "Confirm" to delete the event');
      return;
    }
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (response.ok) {
        alert("Event deleted successfully");
        setDeletingEventId(null);
        setDeleteConfirmText("");
        fetchMyEvents();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete event");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Failed to delete event");
    }
  };
  const handleJoinEvent = async (eventId: number) => {
    try {
      const response = await fetch(`/api/events/${eventId}/join`, {
        method: "POST",
        credentials: "include"
      });
      if (response.ok) {
        fetchUpcomingEvents();
        fetchMyEvents();
        setActiveTab("my-events");
        if (onEventJoined) {
          onEventJoined();
        }
      } else {
        const error = await response.json();
        alert(error.error || "Failed to join event");
      }
    } catch (error) {
      console.error("Error joining event:", error);
      alert("Failed to join event");
    }
  };
  const handleLeaveEvent = async (eventId: number) => {
    try {
      const response = await fetch(`/api/events/${eventId}/leave`, {
        method: "POST",
        credentials: "include"
      });
      if (response.ok) {
        alert("Left event successfully");
        setLeavingEventId(null);
        fetchMyEvents();
        fetchUpcomingEvents();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to leave event");
      }
    } catch (error) {
      console.error("Error leaving event:", error);
      alert("Failed to leave event");
    }
  };
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };
  const formatEventTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };
  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return `${duration} day${duration > 1 ? 's' : ''}`;
  };
  const renderUpcomingTab = () => {
    if (isLoading) {
      return <EventListSkeleton count={3} />;
    }
    if (upcomingEvents.length === 0) {
      return <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400 text-center font-outfit">
            No new events available
          </p>
        </div>;
    }
    // Filter out ended events from Upcoming tab
    const filteredEvents = upcomingEvents.filter(event => {
      const status = getEventStatus(event.start_datetime, event.end_datetime);
      return status !== "ended";
    });

    if (filteredEvents.length === 0) {
      return <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400 text-center font-outfit">
            No new events available
          </p>
        </div>;
    }

    return <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredEvents.map(event => {
        const isExpired = event.is_expired === 1 || event.is_expired === true;
        return <div key={event.id} className="bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <h3 className="text-xl font-bold text-dark-ocean dark:text-white font-outfit">{event.name}</h3>
            </div>

            <div className="space-y-2">
              <div className={`flex items-center gap-2 ${isExpired ? 'text-amber-600 dark:text-amber-400' : 'text-primary-pine dark:text-primary-mint'}`}>
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-outfit">{formatEventDate(event.start_datetime)}</span>
              </div>
              <div className={`flex items-center gap-2 ${isExpired ? 'text-amber-600 dark:text-amber-400' : 'text-primary-pine dark:text-primary-mint'}`}>
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-outfit">
                  {formatEventTime(event.start_datetime)} - {formatEventTime(event.end_datetime)} ({calculateDuration(event.start_datetime, event.end_datetime)})
                </span>
              </div>
              {event.location && (
                <div className={`flex items-center gap-2 ${isExpired ? 'text-amber-600 dark:text-amber-400' : 'text-primary-pine dark:text-primary-mint'}`}>
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-outfit truncate">{event.location}</span>
                </div>
              )}
              <div className={`flex items-center gap-2 ${isExpired ? 'text-amber-600 dark:text-amber-400' : 'text-primary-pine dark:text-primary-mint'}`}>
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-outfit">
                  {event.current_members} / {event.max_members} members
                </span>
              </div>
            </div>

            <p className={`text-sm font-outfit ${isExpired ? 'text-amber-600 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>Created by {event.creator_name}</p>

            <div className="space-y-2">
              <button onClick={() => handleJoinEvent(event.id)} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary-mint to-primary-pine hover:opacity-90 text-white rounded-button-rect font-outfit font-semibold transition-opacity">
                Join Event
              </button>
              {(() => {
                const status = getEventStatus(event.start_datetime, event.end_datetime);
                if (status === 'upcoming') {
                  return (
                    <div className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500/20 to-sky-600/20 dark:from-sky-500/30 dark:to-sky-600/30 border-2 border-sky-500 dark:border-sky-400 rounded-button-rect">
                      <Sparkles className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                      <span className="text-xs font-semibold text-sky-700 dark:text-sky-300 font-outfit">
                        Upcoming · Hurry up
                      </span>
                    </div>
                  );
                } else if (status === 'live') {
                  return (
                    <div className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 dark:from-emerald-500/30 dark:to-emerald-600/30 border-2 border-emerald-500 dark:border-emerald-400 rounded-button-rect">
                      <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 font-outfit">
                        Live · Enjoy
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
              {isExpired && countdowns[event.id] && <div className="w-full flex flex-col items-center gap-1 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 dark:from-amber-500/30 dark:to-orange-500/30 border-2 border-amber-500 dark:border-amber-400 rounded-button-rect animate-pulse">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 font-outfit">
                      Dissolving in {countdowns[event.id]}
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-outfit">
                    All messages & attachments will be deleted
                  </span>
                </div>}
            </div>
          </div>;
      })}
      </div>;
  };
  const renderMyEventsTab = () => {
    if (isLoading) {
      return <EventListSkeleton count={3} />;
    }
    if (myEvents.length === 0) {
      return <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400 text-center font-outfit">
            No events yet
          </p>
        </div>;
    }
    return <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {myEvents.map(event => {
        const isExpired = event.is_expired === 1 || event.is_expired === true;
        return <div key={event.id} className={`border rounded-2xl p-4 space-y-3 ${isExpired ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-500 dark:border-amber-400' : 'bg-slate-50 dark:bg-dark-surface border-slate-200 dark:border-slate-700'}`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-start gap-2 flex-wrap">
                  <h3 className={`text-xl font-bold font-outfit ${isExpired ? 'text-amber-700 dark:text-amber-300' : 'text-dark-ocean dark:text-white'}`}>{event.name}</h3>
                </div>
                {isExpired && <p className="text-xs text-amber-600 dark:text-amber-400 font-outfit font-semibold mt-1">
                    EVENT ENDED - Dissolving Soon
                  </p>}
              </div>
              {event.is_creator === 1 && !isExpired && <span className="px-3 py-1 bg-primary-pine/20 dark:bg-primary-mint/20 text-primary-pine dark:text-primary-mint text-sm font-outfit font-semibold rounded-full">
                  Creator
                </span>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary-pine dark:text-primary-mint">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-outfit">{formatEventDate(event.start_datetime)}</span>
              </div>
              <div className="flex items-center gap-2 text-primary-pine dark:text-primary-mint">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-outfit">
                  {formatEventTime(event.start_datetime)} - {formatEventTime(event.end_datetime)} ({calculateDuration(event.start_datetime, event.end_datetime)})
                </span>
              </div>
              {event.location && (
                <div className="flex items-center gap-2 text-primary-pine dark:text-primary-mint">
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-outfit truncate">{event.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-primary-pine dark:text-primary-mint">
                <Users className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm font-outfit">
                  {event.current_members} / {event.max_members} members
                </span>
              </div>
            </div>

            <p className="text-slate-600 dark:text-slate-400 text-sm font-outfit">Created by {event.creator_name}</p>

            {deletingEventId === event.id ? <div className="space-y-3">
                <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)} placeholder='Type "Confirm" to delete' className="w-full px-4 py-2 bg-transparent border border-error rounded-full text-dark-ocean dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-outfit focus:outline-none" />
                <div className="flex items-center gap-2">
                  <button onClick={() => handleDeleteEvent(event.id)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-error/10 hover:bg-error/20 text-error rounded-full font-outfit font-semibold transition-colors">
                    Confirm Delete
                  </button>
                  <button onClick={() => {
                setDeletingEventId(null);
                setDeleteConfirmText("");
              }} className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-dark-ocean dark:text-white rounded-full font-outfit font-semibold transition-colors">
                    Cancel
                  </button>
                </div>
              </div> : leavingEventId === event.id ? <div className="space-y-3">
                <p className="text-center text-slate-600 dark:text-slate-400 font-outfit">Are you sure you want to leave?</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleLeaveEvent(event.id)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-pine/20 dark:bg-primary-mint/20 hover:bg-primary-pine/30 dark:hover:bg-primary-mint/30 text-primary-pine dark:text-primary-mint rounded-full font-outfit font-semibold transition-colors">
                    <Check className="w-5 h-5" />
                    Yes
                  </button>
                  <button onClick={() => setLeavingEventId(null)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-error/10 hover:bg-error/20 text-error rounded-full font-outfit font-semibold transition-colors">
                    <X className="w-5 h-5" />
                    No
                  </button>
                </div>
              </div> : <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => {
                if (onGoToEventChat) {
                  onGoToEventChat(event.id, event.name);
                  onClose();
                }
              }} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-button-rect font-outfit font-semibold transition-opacity relative ${isExpired ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-gradient-to-r from-primary-mint to-primary-pine hover:opacity-90 text-white'}`}>
                    <MessageCircle className="w-5 h-5" />
                    {isExpired ? 'View Event' : 'Go to Chat'}
                    {eventUnreadCounts[event.id] > 0 && <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[24px] h-6 px-1.5 bg-error text-white text-xs font-bold rounded-full shadow-lg">
                        {eventUnreadCounts[event.id] > 99 ? '99+' : eventUnreadCounts[event.id]}
                      </span>}
                  </button>
                  {!isExpired && <>
                      {event.is_creator === 1 ? <button onClick={() => setDeletingEventId(event.id)} className="p-3 bg-error/10 hover:bg-error/20 text-error rounded-lg transition-colors">
                          <Trash2 className="w-5 h-5" />
                        </button> : <button onClick={() => setLeavingEventId(event.id)} className="p-3 bg-error/10 hover:bg-error/20 text-error rounded-lg transition-colors">
                          <LogOut className="w-5 h-5" />
                        </button>}
                    </>}
                </div>
                {(() => {
                  const status = getEventStatus(event.start_datetime, event.end_datetime);
                  if (!isExpired && status === 'upcoming') {
                    return (
                      <div className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500/20 to-teal-500/20 dark:from-cyan-500/30 dark:to-teal-500/30 border-2 border-cyan-500 dark:border-cyan-400 rounded-button-rect">
                        <Sparkles className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                        <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 font-outfit">
                          Upcoming · Hurry up
                        </span>
                      </div>
                    );
                  } else if (!isExpired && status === 'live') {
                    return (
                      <div className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 dark:from-emerald-500/30 dark:to-emerald-600/30 border-2 border-emerald-500 dark:border-emerald-400 rounded-button-rect">
                        <Zap className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 font-outfit">
                          Live · Enjoy
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
                {isExpired && countdowns[event.id] && <div className="w-full flex flex-col items-center gap-1 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 dark:from-amber-500/30 dark:to-orange-500/30 border-2 border-amber-500 dark:border-amber-400 rounded-button-rect animate-pulse">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 font-outfit">
                        Dissolving in {countdowns[event.id]}
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-outfit">
                      All messages & attachments will be deleted
                    </span>
                  </div>}
              </div>}
          </div>;
      })}
      </div>;
  };
  const renderCreateTab = () => {
    return <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Event Name */}
        <div>
          <label className="block text-dark-ocean dark:text-white font-outfit font-medium mb-2">
            Event Name <span className="text-error">*</span>
          </label>
          <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} placeholder="Enter event name" className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-full text-dark-ocean dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-outfit focus:outline-none focus:border-primary-pine dark:focus:border-primary-mint transition-colors" />
        </div>

        {/* Event Description */}
        <div>
          <label className="block text-dark-ocean dark:text-white font-outfit font-medium mb-2">
            Event Description
          </label>
          <textarea value={eventDescription} onChange={e => setEventDescription(e.target.value)} placeholder="Enter event description (optional)" rows={4} className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-3xl text-dark-ocean dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-outfit focus:outline-none focus:border-primary-pine dark:focus:border-primary-mint transition-colors resize-none" />
        </div>

        {/* Start Date and Time */}
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-dark-ocean dark:text-white font-outfit font-medium mb-2">
                Start Date <span className="text-error">*</span>
              </label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-full text-dark-ocean dark:text-white font-outfit focus:outline-none focus:border-primary-pine dark:focus:border-primary-mint transition-colors [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
            <div>
              <label className="block text-dark-ocean dark:text-white font-outfit font-medium mb-2">Start Time  *</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-full text-dark-ocean dark:text-white font-outfit focus:outline-none focus:border-primary-pine dark:focus:border-primary-mint transition-colors [color-scheme:light] dark:[color-scheme:dark]" />
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-outfit">All event times are in GMT timezone</p>
        </div>

        {/* End Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-dark-ocean dark:text-white font-outfit font-medium mb-2">
              End Date <span className="text-error">*</span>
            </label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-full text-dark-ocean dark:text-white font-outfit focus:outline-none focus:border-primary-pine dark:focus:border-primary-mint transition-colors [color-scheme:light] dark:[color-scheme:dark]" />
          </div>
          <div>
            <label className="block text-dark-ocean dark:text-white font-outfit font-medium mb-2">End Time  *</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-full text-dark-ocean dark:text-white font-outfit focus:outline-none focus:border-primary-pine dark:focus:border-primary-mint transition-colors [color-scheme:light] dark:[color-scheme:dark]" />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-dark-ocean dark:text-white font-outfit font-medium mb-2">
            Location <span className="text-error">*</span>
          </label>
          <input 
            type="text" 
            value={eventLocation} 
            onChange={e => setEventLocation(e.target.value.slice(0, 100))} 
            placeholder="Enter event location" 
            maxLength={100}
            className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-full text-dark-ocean dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-outfit focus:outline-none focus:border-primary-pine dark:focus:border-primary-mint transition-colors" 
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-outfit mt-1">
            {eventLocation.length}/100 characters
          </p>
        </div>

        {/* Maximum Members */}
        <div>
          <label className="block text-dark-ocean dark:text-white font-outfit font-medium mb-2">
            Maximum Members <span className="text-error">*</span>
          </label>
          <input 
            type="number" 
            min="1" 
            max="50" 
            step="1"
            value={maxMembers} 
            onChange={e => {
              const val = e.target.value;
              // Only update if it's a valid number or empty
              if (val === '' || (!isNaN(Number(val)) && Number(val) >= 0)) {
                setMaxMembers(val);
              }
            }}
            onBlur={e => {
              // Ensure value stays within bounds on blur
              const val = e.target.value;
              if (val !== '') {
                const num = parseInt(val, 10);
                if (num < 1) {
                  setMaxMembers('1');
                } else if (num > 50) {
                  setMaxMembers('50');
                } else {
                  setMaxMembers(num.toString());
                }
              }
            }}
            placeholder="Maximum 50" 
            className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-full text-dark-ocean dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-outfit focus:outline-none focus:border-primary-pine dark:focus:border-primary-mint transition-colors" 
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-outfit mt-1">
            Enter a number between 1 and 50
          </p>
        </div>

        {/* Event Image */}
        <div>
          <label className="block text-dark-ocean dark:text-white font-outfit font-medium mb-2">
            Event Image
          </label>
          
          {eventImage && imageUrl ? <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-soft">
              <img src={imageUrl} alt="Event preview" className="w-full h-48 object-cover" />
              <button onClick={() => {
            setEventImage(null);
            setImageUrl("");
          }} className="absolute top-2 right-2 p-2 bg-error hover:bg-error/90 text-white rounded-full shadow-lg transition-all hover:scale-110" title="Remove image">
                <X className="w-4 h-4" />
              </button>
            </div> : <label className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-full text-slate-600 dark:text-slate-400 font-outfit cursor-pointer hover:border-primary-pine dark:hover:border-primary-mint transition-colors">
              <ImageIcon className="w-5 h-5 text-slate-600 dark:text-white" />
              <span>{isUploading ? "Uploading..." : "Add Image (Optional)"}</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} className="hidden" />
            </label>}
        </div>

        {/* Event Constraints */}
        <div className="bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
          <div className="bg-primary-pine/20 dark:bg-primary-mint/20 px-4 py-2 border-b border-primary-pine/30 dark:border-primary-mint/30">
            <h3 className="text-primary-pine dark:text-primary-mint font-outfit font-semibold">Event Constraints:</h3>
          </div>
          <div className="px-4 py-3 space-y-1">
            <p className="text-slate-600 dark:text-slate-400 text-sm font-outfit">• Events can be scheduled up to 1 month in advance</p>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-outfit">• Maximum event duration is 5 days</p>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-outfit">• Maximum 50 members can attend</p>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-outfit">• You can only create 3 active events at a time</p>
            <p className="text-slate-600 dark:text-slate-400 text-sm font-outfit">• All event times are in GMT timezone only</p>
          </div>
        </div>

        {/* Create Event Button */}
        <button onClick={handleCreateEvent} disabled={!isFormValid() || isCreating || isUploading} className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-button-rect font-outfit font-semibold transition-all ${isFormValid() && !isCreating && !isUploading ? "bg-gradient-to-r from-primary-mint to-primary-pine hover:opacity-90 text-white cursor-pointer" : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"}`}>
          <Calendar className="w-5 h-5" />
          {isCreating ? "Creating Event..." : "Create Event"}
        </button>
      </div>;
  };
  return <div className="h-full flex flex-col bg-white dark:bg-dark-ocean">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
        <h2 className="text-2xl font-bold text-dark-ocean dark:text-white font-outfit">Events</h2>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <X className="w-6 h-6 text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button onClick={() => setActiveTab("upcoming")} className={`flex-1 px-4 py-3 font-outfit font-semibold transition-colors relative ${activeTab === "upcoming" ? "text-primary-pine dark:text-primary-mint" : "text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
          Upcoming
          {activeTab === "upcoming" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-pine dark:bg-primary-mint" />}
        </button>
        <button onClick={() => setActiveTab("my-events")} className={`flex-1 px-4 py-3 font-outfit font-semibold transition-colors relative ${activeTab === "my-events" ? "text-primary-pine dark:text-primary-mint" : "text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
          My Events
          {activeTab === "my-events" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-pine dark:bg-primary-mint" />}
        </button>
        <button onClick={() => setActiveTab("create")} className={`flex-1 px-4 py-3 font-outfit font-semibold transition-colors relative ${activeTab === "create" ? "text-primary-pine dark:text-primary-mint" : "text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}>
          Create
          {activeTab === "create" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-pine dark:bg-primary-mint" />}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "upcoming" && renderUpcomingTab()}
      {activeTab === "my-events" && renderMyEventsTab()}
      {activeTab === "create" && renderCreateTab()}
    </div>;
}