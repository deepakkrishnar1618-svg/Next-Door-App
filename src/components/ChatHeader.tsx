import { useAuth } from "@/src/lib/auth-hook";
import { useRouter } from "next/navigation";
import { Bell, Calendar, ArrowLeft, Handshake } from "lucide-react";
import HeaderMenu from "@/src/components/HeaderMenu";

interface ChatHeaderProps {
  onToggleUserList: () => void;
  onToggleAdminSettings?: () => void;
  onEditProfile: () => void;
  onToggleNotifications: () => void;
  onToggleSearch?: () => void;
  onShowOnboarding?: () => void;
  onShowCreator?: () => void;
  userCount: number;
  isAdmin: boolean;
  notificationCount: number;
  groupName?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  onExitEvent?: () => void;
  onDeleteEvent?: () => void;
  isEventCreator?: boolean;
  // Listing chat props
  isListingChat?: boolean;
  onExitListing?: () => void;
  onDeleteListing?: () => void;
  isListingCreator?: boolean;
  // Custom header element (e.g., winner selector)
  customHeaderElement?: React.ReactNode;
}

export default function ChatHeader({
  onToggleUserList,
  onToggleAdminSettings,
  onEditProfile,
  onToggleNotifications,
  onToggleSearch,
  onShowOnboarding,
  onShowCreator,
  userCount,
  isAdmin,
  notificationCount,
  groupName,
  showBackButton,
  onBack,
  onExitEvent,
  onDeleteEvent,
  isEventCreator,
  isListingChat,
  onExitListing,
  onDeleteListing,
  isListingCreator,
  customHeaderElement,
}: ChatHeaderProps) {
  const { signOut: logout } = useAuth();
  const router = useRouter();

  return (
    <header className="bg-gradient-primary shadow-soft sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-m py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBackButton && onBack && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-button-rect bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-sm hover:scale-105 flex-shrink-0"
              title="Back to Main Chat"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-white tracking-tight font-nura truncate">
              {groupName || "Next Door"}
            </h1>
            <p className="text-xs text-white/90 font-outfit">{groupName ? "powered by Next Door" : "Join in!"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!showBackButton && (
            <>
              <button
                onClick={() => router.push("/events")}
                className="p-2.5 rounded-button-rect bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-sm hover:scale-105"
                title="Events"
              >
                <Calendar className="w-5 h-5" />
              </button>

              <button
                onClick={() => router.push("/market")}
                className="p-2.5 rounded-button-rect bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-sm hover:scale-105"
                title="Quick Request"
              >
                <Handshake className="w-5 h-5" />
              </button>

              <button
                onClick={onToggleNotifications}
                className="relative p-2.5 rounded-button-rect bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-sm hover:scale-105"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold bg-white text-primary-pine rounded-full border-2 border-white shadow-md">
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </span>
                )}
              </button>
            </>
          )}

          {customHeaderElement}

          <HeaderMenu
            isAdmin={isAdmin}
            userCount={userCount}
            onEditProfile={onEditProfile}
            onAdminSettings={() => onToggleAdminSettings?.()}
            onSearch={() => onToggleSearch?.()}
            onToggleUserList={onToggleUserList}
            onLogout={logout}
            onShowOnboarding={onShowOnboarding}
            onShowCreator={onShowCreator}
            isEventChat={showBackButton && !isListingChat}
            onExitEvent={onExitEvent}
            onDeleteEvent={onDeleteEvent}
            isEventCreator={isEventCreator}
            isListingChat={isListingChat}
            onExitListing={onExitListing}
            onDeleteListing={onDeleteListing}
            isListingCreator={isListingCreator}
          />
        </div>
      </div>
    </header>
  );
}
