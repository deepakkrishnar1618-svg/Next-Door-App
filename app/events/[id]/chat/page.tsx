'use client';

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/auth-hook";
import { useEffect, useState } from "react";
import EventChatView from "@/src/components/EventChatView";

export default function EventChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isPending } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [eventName, setEventName] = useState("Event Chat");

  const eventId = parseInt(params.id || "0");

  useEffect(() => {
    if (!isPending && !user) { router.push("/"); return; }
    if (user) {
      // Fetch event name
      fetch(`/api/events/${eventId}/members`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(() => setIsChecking(false))
        .catch(() => setIsChecking(false));

      fetch(`/api/events/my`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          const events = data?.events || [];
          const evt = events.find((e: { id: number; name: string }) => e.id === eventId);
          if (evt) setEventName(evt.name);
        })
        .catch(() => {});

      setIsChecking(false);
    }
  }, [user, isPending, router, eventId]);

  const handleBack = () => {
    router.push("/events?tab=my-events");
  };

  if (isPending || isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 flex items-center justify-center">
        <div className="text-white text-xl font-outfit">Loading...</div>
      </div>
    );
  }

  if (!user || !eventId) return null;

  return (
    <EventChatView
      eventId={eventId}
      eventName={eventName}
      onBack={handleBack}
    />
  );
}
