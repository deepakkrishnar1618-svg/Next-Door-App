import { useEffect, useRef } from "react";

interface User {
  id: string;
  name: string | null;
  room_number: string | null;
  avatar_url: string | null;
}

interface MentionAutocompleteProps {
  users: User[];
  searchQuery: string;
  onSelect: (user: User) => void;
}

export default function MentionAutocomplete({ 
  users, 
  searchQuery, 
  onSelect,
}: MentionAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    const nameMatch = user.name?.toLowerCase().includes(query);
    const roomMatch = user.room_number?.toLowerCase().includes(query);
    return nameMatch || roomMatch;
  }).slice(0, 5);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [searchQuery]);

  if (filteredUsers.length === 0) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className="absolute bottom-full mb-s left-0 right-0 bg-white dark:bg-dark-surface border border-slate-200 dark:border-slate-700 rounded-button-rect shadow-soft-lg dark:shadow-soft-dark max-h-64 overflow-y-auto z-50"
      style={{ 
        maxWidth: '100%',
      }}
    >
      {filteredUsers.map((user) => (
        <button
          key={user.id}
          onClick={() => onSelect(user)}
          className="w-full flex items-center gap-3 px-m py-3 hover:bg-slate-50 dark:hover:bg-dark-elevated transition-colors text-left border-b border-slate-100 dark:border-slate-700 last:border-b-0"
        >
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name || "User"}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0 shadow-sm"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-sm">
              {((user.name || user.room_number || "?")[0]).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-slate-800 dark:text-white truncate font-outfit">
              {user.name}
            </div>
            {user.room_number && (
              <div className="text-sm text-slate-500 dark:text-slate-400 font-outfit">
                Room {user.room_number}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
