import { useState } from "react";
import { useRouter } from "next/navigation";
import { Circle, Crown, X, Ban, CheckCircle, Trash2, User } from "lucide-react";
import { getUserAvatar, isDeletedUser, isDeactivatedUser } from "@/src/utils/avatars";

interface UserData {
  id: string;
  email?: string; // Email is now optional - only visible to admins or self
  name: string | null;
  room_number: string | null;
  avatar_url: string | null;
  is_admin: number;
  is_online: number;
  last_seen_at: string | null;
  profile_completed: number;
  is_active: number;
  is_deleted?: number;
}

interface UserListProps {
  users: UserData[];
  currentUserId: string;
  onClose?: () => void;
}

export default function UserList({ users, currentUserId, onClose }: UserListProps) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useState(() => {
    const checkAdmin = async () => {
      try {
        const response = await fetch("/api/profile", { credentials: 'include' });
        const data = await response.json();
        setIsAdmin(data.is_admin === 1);
      } catch (error) {
        console.error("Failed to check admin status:", error);
      }
    };
    checkAdmin();
  });

  const formatLastSeen = (dateString: string | null) => {
    if (!dateString) return "Never";
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: number) => {
    setUpdatingUserId(userId);
    try {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: currentStatus === 1 ? 0 : 1 }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to update user status');
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to update user status:', error);
      alert('Failed to update user status');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    const confirmMessage = `Are you sure you want to permanently delete ${userName}'s account? This will remove their profile data and they can create a new account if they sign in again.`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setUpdatingUserId(userId);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to delete user');
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user');
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Categorize users: active, deactivated (blocked), and deleted
  const activeUsers = users.filter(u => u.is_active === 1);
  const deactivatedUsers = users.filter(u => isDeactivatedUser(u.is_active, u.is_deleted));
  const deletedUsers = users.filter(u => isDeletedUser(u.is_deleted));
  const onlineUsers = activeUsers.filter(u => u.is_online);
  const offlineUsers = activeUsers.filter(u => !u.is_online);

  const renderUser = (user: UserData, showActions: boolean = false) => {
    const isDeleted = isDeletedUser(user.is_deleted);
    const isDeactivated = isDeactivatedUser(user.is_active, user.is_deleted);
    const isInactive = isDeleted || isDeactivated;

    const handleUserClick = () => {
      // Don't navigate for deleted users
      if (!isDeleted) {
        router.push(`/profile/${encodeURIComponent(user.id)}`);
      }
    };

    return (
      <div
        key={user.id}
        className={`flex items-center gap-3 p-2 rounded-button-rect transition-all font-outfit ${
          user.id === currentUserId 
            ? "bg-primary-mint/10 dark:bg-primary-mint/20" 
            : "hover:bg-slate-100 dark:hover:bg-dark-elevated"
        } ${isInactive ? "opacity-60" : ""}`}
      >
        <div 
          className={`flex items-center gap-3 flex-1 min-w-0 ${!isDeleted ? "cursor-pointer" : ""}`}
          onClick={handleUserClick}
        >
          <div className="relative flex-shrink-0">
          {isDeleted ? (
            // Deleted users show gray silhouette
            <div className="w-10 h-10 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            </div>
          ) : (
            <>
              <img
                src={getUserAvatar(user.id, user.avatar_url)}
                alt={user.name || user.email}
                className={`w-10 h-10 rounded-full border-2 border-white dark:border-dark-ocean shadow-soft object-cover ${
                  !user.is_online || isDeactivated ? "opacity-60" : ""
                }`}
              />
              {user.is_active === 1 && (
                <Circle
                  className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${
                    user.is_online 
                      ? "text-success fill-success" 
                      : "text-slate-400 dark:text-slate-600 fill-slate-400 dark:fill-slate-600"
                  }`}
                />
              )}
            </>
          )}
        </div>

          <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className={`text-sm font-medium truncate ${
              isInactive 
                ? "text-slate-500 dark:text-slate-400" 
                : user.is_online 
                  ? "text-slate-800 dark:text-white" 
                  : "text-slate-600 dark:text-slate-400"
            }`}>
              {user.name || (user.email ? user.email : 'User')}
            </span>
            {user.is_admin === 1 && (
              <Crown className="w-4 h-4 text-warning flex-shrink-0" />
            )}
            {user.id === currentUserId && (
              <span className="text-xs text-slate-500 dark:text-slate-400">(you)</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isDeleted ? (
              // Deleted users show only "Deleted" label
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Deleted
              </span>
            ) : isDeactivated ? (
              // Deactivated users show room + Deactivated label
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
              // Active users show room + last seen
              <>
                {user.room_number && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Room {user.room_number}
                  </span>
                )}
                {!user.is_online && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    • {formatLastSeen(user.last_seen_at)}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        </div>

        {/* Actions: only show for non-deleted users that aren't the current user */}
        {showActions && user.id !== currentUserId && !isDeleted && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleToggleUserStatus(user.id, user.is_active)}
              disabled={updatingUserId === user.id}
              className={`p-2 rounded-button-rect transition-all hover:scale-105 ${
                user.is_active === 1
                  ? "hover:bg-error/10 text-error"
                  : "hover:bg-success/10 text-success"
              } disabled:opacity-50`}
              title={user.is_active === 1 ? "Deactivate user" : "Reactivate user"}
            >
              {updatingUserId === user.id ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : user.is_active === 1 ? (
                <Ban className="w-5 h-5" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => handleDeleteUser(user.id, user.name || user.email || 'User')}
              disabled={updatingUserId === user.id}
              className="p-2 rounded-button-rect transition-all hover:scale-105 hover:bg-error/10 text-error disabled:opacity-50"
              title="Delete user account permanently"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        )}
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
              Online — {onlineUsers.length}
            </div>
            <div className="space-y-s">
              {onlineUsers.map(user => renderUser(user, isAdmin))}
            </div>
          </div>
        )}

        {offlineUsers.length > 0 && (
          <div className="mb-xl">
            <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-s font-outfit">
              Offline — {offlineUsers.length}
            </div>
            <div className="space-y-s">
              {offlineUsers.map(user => renderUser(user, isAdmin))}
            </div>
          </div>
        )}

        {/* Deactivated users - visible to all, actions for admin only */}
        {deactivatedUsers.length > 0 && (
          <div className="mb-xl">
            <div className="text-sm font-semibold text-error mb-s font-outfit">
              Deactivated — {deactivatedUsers.length}
            </div>
            <div className="space-y-s">
              {deactivatedUsers.map(user => renderUser(user, isAdmin))}
            </div>
          </div>
        )}

        {/* Deleted users - visible to all, no actions */}
        {deletedUsers.length > 0 && (
          <div>
            <div className="text-sm font-semibold text-slate-400 dark:text-slate-500 mb-s font-outfit">
              Deleted — {deletedUsers.length}
            </div>
            <div className="space-y-s">
              {deletedUsers.map(user => renderUser(user, false))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
