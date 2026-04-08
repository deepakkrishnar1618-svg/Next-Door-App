'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Image as ImageIcon, X } from "lucide-react";

export default function CreateEventPage() {
  const router = useRouter();
  
  // Form state
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

    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    const now = new Date();
    if (start <= now) return false;
    if (end <= start) return false;

    const oneMonthFromNow = new Date(now);
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
    if (start > oneMonthFromNow) return false;

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
        headers: { "Content-Type": "application/json" },
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
        router.push("/events?tab=my-events");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-bg to-slate-100 dark:from-dark-ocean dark:to-dark-ocean">
      {/* Header */}
      <header className="bg-gradient-primary shadow-soft sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/events")}
            className="p-2.5 rounded-button-rect bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-sm hover:scale-105"
            title="Back to Events"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-extrabold text-white tracking-tight font-nura">Create Event</h1>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 space-y-6">
          {/* Event Name */}
          <div>
            <label className="block text-dark-ocean dark:text-white font-outfit font-medium mb-2">
              Event Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={eventName}
              onChange={e => setEventName(e.target.value.slice(0, 12))}
              placeholder="Enter event name"
              maxLength={12}
              className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-full text-dark-ocean dark:text-white placeholder-slate-400 font-outfit focus:outline-none focus:border-primary-pine dark:focus:border-primary-mint transition-colors"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-outfit mt-1">{eventName.length}/12 characters</p>
          </div>

          {/* Event Description */}
          <div>
            <label className="block text-dark-ocean dark:text-white font-outfit font-medium mb-2">
              Event Description
            </label>
            <textarea
              value={eventDescription}
              onChange={e => setEventDescription(e.target.value)}
              placeholder="Enter event description (optional)"
              rows={4}
              className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-3xl text-dark-ocean dark:text-white placeholder-slate-400 font-outfit focus:outline-none focus:border-primary-pine dark:focus:border-primary-mint transition-colors resize-none"
            />
          </div>

          {/* Start Date and Time */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-dark-ocean dark:text-white font-outfit font-medium mb-2">
                  Start Date <span className="text-error">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-full text-dark-ocean dark:text-white font-outfit focus:outline-none focus:border-primary-pine dark:focus:border-primary-mint transition-colors [color-scheme:light] dark:[color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-dark-ocean dark:text-white font-outfit font-medium mb-2">
                  Start Time <span className="text-error">*</span>
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-full text-dark-ocean dark:text-white font-outfit focus:outline-none focus:border-primary-pine dark:focus:border-primary-mint transition-colors [color-scheme:light] dark:[color-scheme:dark]"
                />
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
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-full text-dark-ocean dark:text-white font-outfit focus:outline-none focus:border-primary-pine dark:focus:border-primary-mint transition-colors [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
            <div>
              <label className="block text-dark-ocean dark:text-white font-outfit font-medium mb-2">
                End Time <span className="text-error">*</span>
              </label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-full text-dark-ocean dark:text-white font-outfit focus:outline-none focus:border-primary-pine dark:focus:border-primary-mint transition-colors [color-scheme:light] dark:[color-scheme:dark]"
              />
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
              className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-full text-dark-ocean dark:text-white placeholder-slate-400 font-outfit focus:outline-none focus:border-primary-pine dark:focus:border-primary-mint transition-colors"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-outfit mt-1">{eventLocation.length}/100 characters</p>
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
                if (val === '' || (!isNaN(Number(val)) && Number(val) >= 0)) {
                  setMaxMembers(val);
                }
              }}
              onBlur={e => {
                const val = e.target.value;
                if (val !== '') {
                  const num = parseInt(val, 10);
                  if (num < 1) setMaxMembers('1');
                  else if (num > 50) setMaxMembers('50');
                  else setMaxMembers(num.toString());
                }
              }}
              placeholder="Maximum 50"
              className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-full text-dark-ocean dark:text-white placeholder-slate-400 font-outfit focus:outline-none focus:border-primary-pine dark:focus:border-primary-mint transition-colors"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-outfit mt-1">Enter a number between 1 and 50</p>
          </div>

          {/* Event Image */}
          <div>
            <label className="block text-dark-ocean dark:text-white font-outfit font-medium mb-2">Event Image</label>
            {eventImage && imageUrl ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 shadow-soft">
                <img src={imageUrl} alt="Event preview" className="w-full h-48 object-cover" />
                <button
                  onClick={() => { setEventImage(null); setImageUrl(""); }}
                  className="absolute top-2 right-2 p-2 bg-error hover:bg-error/90 text-white rounded-full shadow-lg transition-all hover:scale-110"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-full text-slate-600 dark:text-slate-400 font-outfit cursor-pointer hover:border-primary-pine dark:hover:border-primary-mint transition-colors">
                <ImageIcon className="w-5 h-5 text-slate-600 dark:text-white" />
                <span>{isUploading ? "Uploading..." : "Add Image (Optional)"}</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={isUploading} className="hidden" />
              </label>
            )}
          </div>

          {/* Event Constraints */}
          <div className="bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
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
          <button
            onClick={handleCreateEvent}
            disabled={!isFormValid() || isCreating || isUploading}
            className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-button-rect font-outfit font-semibold transition-all ${
              isFormValid() && !isCreating && !isUploading
                ? "bg-gradient-to-r from-primary-mint to-primary-pine hover:opacity-90 text-white cursor-pointer"
                : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            }`}
          >
            <Calendar className="w-5 h-5" />
            {isCreating ? "Creating Event..." : "Create Event"}
          </button>
        </div>
      </div>
    </div>
  );
}
