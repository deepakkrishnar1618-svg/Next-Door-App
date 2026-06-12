import { Circle, X, Crown, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { getUserAvatar, isDeletedUser, isDeactivatedUser } from "@/src/utils/avatars";

interface EventUser {
  user_id: string;
  name: string;
  room_number: string | null;
  avatar_url: string | null;
  is_creator?: boolean | number;
  is_online?: boolean | number;
  is_admin?: number;
  is_active?: number | null;
  is_deleted?: number | null;
  last_seen_at?: string | null;
}

interface EventUserListProps {
  users: EventUser[];
  currentUserId: string;
  onClose?: () => void;
}

export default function EventUserList({ users, currentUserId, onClose }: EventUserListProps) {
  const router = useRouter();
  
  // Categorize users
  const activeUsers = users.filter(u => !isDeletedUser(u.is_deleted) && !isDeactivatedUser(u.is_active, u.is_deleted));
  const deactivatedUsers = users.filter(u => isDeactivatedUser(u.is_active, u.is_deleted));
  const deletedUsers = users.filter(u => isDeletedUser(u.is_deleted));
  
  const onlineUsers = activeUsers.filter(u => u.is_online === 1 || u.is_online === true);
  const offlineUsers = activeUsers.filter(u => !(u.is_online === 1 || u.is_online === true));

  const renderUser = (user: EventUser) => {
    const isCreator = user.is_creator === 1 || user.is_creator === true;
    const isOnline = user.is_online === 1 || user.is_online === true;
    const memberIsDeleted = isDeletedUser(user.is_deleted);
    const memberIsDeactivated = isDeactivatedUser(user.is_active, user.is_deleted);
    const isInactive = memberIsDeleted || memberIsDeactivated;

    const handleUserClick = () => {
      if (!memberIsDeleted) {
        router.push(`/profile/${encodeURIComponent(user.user_id)}`);
      }
    };
    
    return (
      <div
        key={user.user_id}
        className={`flex items-center gap-3 p-2 rounded-button-rect transition-all font-outfit ${
          user.user_id === currentUserId 
            ? "bg-primary-mint/10 dark:bg-primary-mint/20" 
            : "hover:bg-slate-100 dark:hover:bg-dark-elevated"
        } ${isInactive ? "opacity-60" : ""}`}
      >
        <div 
          className={`flex items-center gap-3 flex-1 min-w-0 ${!memberIsDeleted ? "cursor-pointer" : ""}`}
          onClick={handleUserClick}
        >
          <div className="relative flex-shrink-0">
          {memberIsDeleted ? (
            <div className="w-10 h-10 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            </div>
          ) : (
            <>
              <img
                src={getUserAvatar(user.user_id, user.avatar_url)}
                alt={user.name}
                className={`w-10 h-10 rounded-full border-2 border-white dark:border-dark-ocean shadow-soft object-cover ${
                  memberIsDeactivated ? "opacity-60" : ""
                }`}
              />
              {!isInactive && (
                <Circle className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${
                  isOnline 
                    ? "text-success fill-success" 
                    : "text-slate-400 dark:text-slate-500 fill-slate-400 dark:fill-slate-500"
                }`} />
              )}
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className={`text-sm font-medium truncate ${
              isInactive 
                ? "text-slate-500 dark:text-slate-400" 
                : "text-slate-800 dark:text-white"
            }`}>
              {user.name}
            </span>
            {user.is_admin === 1 && (
              <Crown className="w-4 h-4 text-warning flex-shrink-0" />
            )}
            {isCreator && !isInactive && (
              <span className="px-2 py-0.5 text-xs font-medium bg-primary-mint/20 text-primary-pine dark:text-primary-mint rounded-full">
                Creator
              </span>
            )}
            {user.user_id === currentUserId && (
              <span className="text-xs text-slate-500 dark:text-slate-400">(you)</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {memberIsDeleted ? (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Deleted
              </span>
            ) : memberIsDeactivated ? (
              <>
                {user.room_number && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Room {user.room_number}
                  </span>
                )}
                <span className="text-xs text-error font-medium">
                  • Deactivated
                </span>
              </>
            ) : (
              user.room_number && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Room {user.room_number}
                </span>
              )
            )}
          </div>
        </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-dark-ocean">
      <div className="sticky top-0 bg-white dark:bg-dark-ocean border-b border-slate-200 dark:border-slate-700 px-xl py-m z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-nura">
            Members ({activeUsers.length})
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-dark-elevated rounded-button-rect transition-all hover:scale-105"
            >
              <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-xl py-m">
        {onlineUsers.length > 0 && (
          <div className="mb-xl">
            <div className="text-sm font-semibold text-success mb-s font-outfit">
              Online - {onlineUsers.length}
            </div>
            <div className="space-y-s">
              {onlineUsers.map(user => renderUser(user))}
            </div>
          </div>
        )}
        
        {offlineUsers.length > 0 && (
          <div className="mb-xl">
            <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-s font-outfit">
              Offline - {offlineUsers.length}
            </div>
            <div className="space-y-s">
              {offlineUsers.map(user => renderUser(user))}
            </div>
          </div>
        )}

        {deactivatedUsers.length > 0 && (
          <div className="mb-xl">
            <div className="text-sm font-semibold text-error mb-s font-outfit">
              Deactivated - {deactivatedUsers.length}
            </div>
            <div className="space-y-s">
              {deactivatedUsers.map(user => renderUser(user))}
            </div>
          </div>
        )}

        {deletedUsers.length > 0 && (
          <div>
            <div className="text-sm font-semibold text-slate-400 dark:text-slate-500 mb-s font-outfit">
              Deleted - {deletedUsers.length}
            </div>
            <div className="space-y-s">
              {deletedUsers.map(user => renderUser(user))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
