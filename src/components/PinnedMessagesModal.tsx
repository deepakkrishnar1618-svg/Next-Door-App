import { X, Pin } from "lucide-react";
import { getUserAvatar } from "@/src/utils/avatars";
import type { Message } from "@/src/lib/types";

interface PinnedMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  onUnpin: (messageId: number) => void;
  onScrollToMessage: (messageId: number) => void;
  isAdmin: boolean;
}

export default function PinnedMessagesModal({
  isOpen,
  onClose,
  messages,
  onUnpin,
  onScrollToMessage,
  isAdmin,
}: PinnedMessagesModalProps) {
  if (!isOpen) return null;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] flex items-center justify-center p-4 animate-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-dark-ocean rounded-2xl shadow-soft-lg dark:shadow-soft-dark w-full max-w-2xl max-h-[80vh] flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Pin className="w-5 h-5 text-primary-mint" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-white font-nura">
              Pinned Messages
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-dark-elevated rounded-button transition-colors"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Pin className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 font-outfit">No pinned messages yet</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className="group bg-slate-50 dark:bg-dark-surface rounded-button-rect p-4 border border-slate-200 dark:border-slate-700 hover:border-primary-mint dark:hover:border-primary-mint transition-colors"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={getUserAvatar(message.user_id, message.user_avatar_url ?? null)}
                    alt={message.user_name}
                    className="w-8 h-8 rounded-full border-2 border-white dark:border-dark-ocean shadow-soft object-cover flex-shrink-0"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 dark:text-white font-outfit">
                          {message.user_name}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-outfit">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            onScrollToMessage(message.id);
                            onClose();
                          }}
                          className="text-xs px-3 py-1 bg-primary-mint hover:bg-primary-pine text-white rounded-button transition-colors font-outfit"
                        >
                          View
                        </button>
                        
                        {isAdmin && (
                          <button
                            onClick={() => onUnpin(message.id)}
                            className="text-xs px-3 py-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-button transition-colors font-outfit"
                          >
                            Unpin
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words font-outfit">
                      {message.content}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
