import { useRef, useEffect } from "react";
import { getUserAvatar } from "@/src/utils/avatars";
import { X } from "lucide-react";

interface ReactionUser {
  user_id: string;
  user_name: string;
  emoji: string;
}

interface ReactionDetailsPopupProps {
  emoji: string;
  reactions: ReactionUser[];
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
  isOwnMessage?: boolean;
}

export default function ReactionDetailsPopup({ 
  emoji, 
  reactions, 
  isOpen, 
  onClose, 
  isMobile,
  isOwnMessage = false
}: ReactionDetailsPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Mobile/Tablet: Inline card below message (not a modal)
  if (isMobile) {
    return (
      <div 
        ref={popupRef}
        className="mt-2 bg-dark-surface rounded-xl shadow-lg border border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        style={{ maxWidth: '280px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <span className="text-base">{emoji}</span>
            <span className="text-sm font-medium text-white font-outfit">
              {reactions.length} {reactions.length === 1 ? 'reaction' : 'reactions'}
            </span>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 rounded-full hover:bg-slate-600 transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* User list */}
        <div className="overflow-y-auto" style={{ maxHeight: `${5 * 40}px` }}>
          {reactions.map((reaction, index) => (
            <div 
              key={`${reaction.user_id}-${index}`}
              className="flex items-center gap-3 px-3 py-2"
            >
              <img
                src={getUserAvatar(reaction.user_id, null)}
                alt={reaction.user_name}
                className="w-7 h-7 rounded-full border border-slate-600 shadow-sm object-cover"
              />
              <span className="flex-1 font-medium text-white font-outfit text-sm">
                {reaction.user_name}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Desktop/Tablet: Inline popup - always above to avoid overlap with new messages
  const maxPopupHeight = 5 * 36 + 40;
  
  return (
    <div 
      ref={popupRef}
      className={`absolute z-[100] bg-white dark:bg-dark-elevated rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 overflow-hidden animate-in fade-in zoom-in-95 duration-150 bottom-full mb-2 ${isOwnMessage ? 'right-0' : 'left-0'}`}
      style={{ 
        minWidth: '180px',
        maxWidth: '240px',
        maxHeight: `${maxPopupHeight}px`
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-600 sticky top-0 bg-white dark:bg-dark-elevated">
        <span className="text-base">{emoji}</span>
        <span className="text-sm font-medium text-slate-700 dark:text-white font-outfit">
          {reactions.length} {reactions.length === 1 ? 'reaction' : 'reactions'}
        </span>
      </div>

      {/* User list */}
      <div className="overflow-y-auto" style={{ maxHeight: `${5 * 36}px` }}>
        {reactions.map((reaction, index) => (
          <div 
            key={`${reaction.user_id}-${index}`}
            className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-600/50 transition-colors"
          >
            <img
              src={getUserAvatar(reaction.user_id, null)}
              alt={reaction.user_name}
              className="w-6 h-6 rounded-full border border-white dark:border-slate-500 shadow-sm object-cover"
            />
            <span className="flex-1 text-sm font-medium text-slate-800 dark:text-white font-outfit truncate">
              {reaction.user_name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
