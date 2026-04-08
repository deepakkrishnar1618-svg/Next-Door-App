import { useState } from "react";
import { 
  Calendar, 
  Plus, 
  MessageCircle, 
  Clock, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Users
} from "lucide-react";

interface OnboardingScreen {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconBgColor: string;
}

const screens: OnboardingScreen[] = [
  {
    icon: <Calendar className="w-16 h-16 text-violet-500" />,
    title: "Community Events",
    description: "Events bring neighbors together! Create gatherings like game nights, potlucks, building meetings, or fitness sessions. Everyone can see and join.",
    iconBgColor: "from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30",
  },
  {
    icon: <Plus className="w-16 h-16 text-emerald-500" />,
    title: "Create an Event",
    description: "Tap the + button to create your event. Add a name, description, location, date & time, and optionally an image. Set a member limit if needed.",
    iconBgColor: "from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30",
  },
  {
    icon: <Users className="w-16 h-16 text-cyan-500" />,
    title: "Join & Participate",
    description: "Browse upcoming events and tap 'Join Event' to participate. You'll see events in 'My Events' tab once you join. Creators can manage their events.",
    iconBgColor: "from-cyan-100 to-blue-100 dark:from-cyan-900/30 dark:to-blue-900/30",
  },
  {
    icon: <MessageCircle className="w-16 h-16 text-amber-500" />,
    title: "Dedicated Chat",
    description: "Each event has its own private chat for participants. Coordinate details, share updates, and connect with attendees — all in one place.",
    iconBgColor: "from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30",
  },
  {
    icon: <Clock className="w-16 h-16 text-rose-500" />,
    title: "Auto-Cleanup",
    description: "Events automatically dissolve 24 hours after ending. All messages and attachments are deleted to keep your community tidy. Check history for past events!",
    iconBgColor: "from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30",
  },
];

interface EventsOnboardingProps {
  onClose: () => void;
}

export default function EventsOnboarding({ onClose }: EventsOnboardingProps) {
  const [currentScreen, setCurrentScreen] = useState(0);

  const handleNext = () => {
    if (currentScreen < screens.length - 1) {
      setCurrentScreen(currentScreen + 1);
    }
  };

  const handleBack = () => {
    if (currentScreen > 0) {
      setCurrentScreen(currentScreen - 1);
    }
  };

  const screen = screens[currentScreen];
  const isLastScreen = currentScreen === screens.length - 1;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-dark-surface rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-all hover:scale-110"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* Decorative top pattern */}
          <div className="h-2 bg-gradient-to-r from-violet-400 via-purple-400 to-violet-500" />
          
          <div className="p-8 pb-6">
            {/* Decorative sparkles */}
            <div className="relative">
              <div className="absolute -top-2 left-4 text-violet-400/30">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="absolute top-8 right-6 text-purple-400/30">
                <Sparkles className="w-3 h-3" />
              </div>
              <div className="absolute top-20 left-8 text-violet-400/30">
                <Sparkles className="w-2 h-2" />
              </div>
              
              {/* Icon container with gradient background */}
              <div className="flex justify-center mb-8">
                <div className={`w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-gradient-to-br ${screen.iconBgColor} flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-800 transition-all duration-500`}>
                  <div className="animate-pulse-slow">
                    {screen.icon}
                  </div>
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-center mb-4 text-slate-800 dark:text-white font-nura transition-all duration-300">
              {screen.title}
            </h1>

            {/* Description */}
            <p className="text-center text-slate-600 dark:text-slate-300 mb-8 leading-relaxed font-outfit text-sm sm:text-base px-2">
              {screen.description}
            </p>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-8">
              {screens.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentScreen(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    index === currentScreen
                      ? "bg-gradient-to-r from-violet-400 to-purple-500 w-6"
                      : index < currentScreen
                      ? "bg-violet-400/50"
                      : "bg-slate-300 dark:bg-slate-600"
                  }`}
                  aria-label={`Go to screen ${index + 1}`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex gap-3">
              {currentScreen > 0 && (
                <button
                  onClick={handleBack}
                  className="flex-1 py-3 px-6 rounded-xl border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-50 dark:hover:bg-dark-elevated transition-all duration-200 flex items-center justify-center gap-2 font-outfit"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Back
                </button>
              )}
              
              <button
                onClick={isLastScreen ? onClose : handleNext}
                className={`flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-violet-400 to-purple-500 hover:from-violet-500 hover:to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 font-outfit ${
                  currentScreen === 0 ? "w-full" : ""
                }`}
              >
                {isLastScreen ? (
                  <>
                    Got It!
                    <Sparkles className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

            {/* Skip option */}
            {!isLastScreen && (
              <button
                onClick={onClose}
                className="w-full mt-4 py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-medium transition-colors font-outfit text-sm"
              >
                Skip
              </button>
            )}
          </div>
        </div>

        {/* Page indicator */}
        <p className="text-center text-slate-500 dark:text-slate-400 mt-4 text-sm font-outfit">
          {currentScreen + 1} of {screens.length}
        </p>
      </div>
    </div>
  );
}
