'use client';

import { useEffect, useState } from "react";
import { useAuth } from "@/src/lib/auth-hook";
import { useRouter } from "next/navigation";
import ChatLayout from "@/src/components/ChatLayout";
import EventChatView from "@/src/components/EventChatView";

type View = 'main' | 'event';
interface EventView { eventId: number; eventName: string; }

export default function ChatPage() {
  const { user, isPending } = useAuth();
  const router = useRouter();
  const [isCheckingProfile, setIsCheckingProfile] = useState(true);
  const [currentView, setCurrentView] = useState<View>('main');
  const [eventView, setEventView] = useState<EventView | null>(null);

  useEffect(() => {
    if (!isPending && !user) { router.push("/"); return; }
    if (user) {
      fetch("/api/profile", { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (!data) { setIsCheckingProfile(false); return; }
          if (!data.profile_completed) router.push("/profile/setup");
          else setIsCheckingProfile(false);
        })
        .catch(() => setIsCheckingProfile(false));
    }
  }, [user, isPending, router]);

  const handleGoToEventChat = (eventId: number, eventName: string) => {
    setEventView({ eventId, eventName });
    setCurrentView('event');
  };

  const handleBackToMain = () => { setCurrentView('main'); setEventView(null); };

  if (isPending || isCheckingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  if (currentView === 'event' && eventView) {
    return <EventChatView eventId={eventView.eventId} eventName={eventView.eventName} onBack={handleBackToMain} />;
  }

  return <ChatLayout groupId="main" onGoToEventChat={handleGoToEventChat} />;
}
