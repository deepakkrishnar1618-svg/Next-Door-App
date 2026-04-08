import { getUserAvatar } from "@/src/utils/avatars";

interface TypingUser {
  user_id: string;
  name: string;
  avatar_url: string | null;
  room_number: string | null;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
}

export default function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const maxAvatars = 3;
  const displayUsers = typingUsers.slice(0, maxAvatars);
  const extraCount = typingUsers.length - maxAvatars;

  return (
    <div className="flex items-center gap-2 px-3 py-2">
      {/* Overlapping avatars */}
      <div className="flex -space-x-2">
        {displayUsers.map((user, index) => (
          <div
            key={user.user_id}
            className="relative"
            style={{ zIndex: maxAvatars - index }}
          >
            <img
              src={getUserAvatar(user.user_id, user.avatar_url)}
              alt={user.name || "User"}
              className="w-7 h-7 rounded-full border-2 border-white dark:border-dark-ocean object-cover"
            />
          </div>
        ))}
        {extraCount > 0 && (
          <div
            className="relative w-7 h-7 rounded-full border-2 border-white dark:border-dark-ocean bg-primary-pine flex items-center justify-center"
            style={{ zIndex: 0 }}
          >
            <span className="text-xs font-semibold text-white">+{extraCount}</span>
          </div>
        )}
      </div>

      {/* Bouncing dots */}
      <div className="flex items-center gap-1 bg-light-surface dark:bg-dark-surface rounded-full px-3 py-2">
        <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce-dot-1" />
        <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce-dot-2" />
        <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 animate-bounce-dot-3" />
      </div>
    </div>
  );
}
