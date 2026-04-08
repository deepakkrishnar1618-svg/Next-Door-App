import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Trash2, MoreVertical, Reply, Smile, Pin, User, Info, Copy, Clock } from "lucide-react";
import AttachmentPreview from "@/src/components/AttachmentPreview";
import EventMessageDisplay from "@/src/components/EventMessageDisplay";
import ListingMessageDisplay from "@/src/components/ListingMessageDisplay";
import ReactionDetailsPopup from "@/src/components/ReactionDetailsPopup";
import { getUserAvatar, isDeletedUser, isDeactivatedUser } from "@/src/utils/avatars";
import type { Message, Reaction } from "@/src/lib/types";

// Parse text and convert URLs to clickable links
function parseTextWithLinks(text: string): React.ReactNode[] {
  // URL regex pattern - matches http, https, and www URLs
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = urlRegex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    
    // Add the URL as a clickable link
    let url = match[0];
    // Add protocol if missing (for www. URLs)
    const href = url.startsWith('http') ? url : `https://${url}`;
    
    parts.push(
      <a
        key={match.index}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="text-blue-500 dark:text-blue-400 underline hover:text-blue-600 dark:hover:text-blue-300 transition-colors"
      >
        {url}
      </a>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after last URL
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return parts.length > 0 ? parts : [text];
}

function ExpandableText({ content, isDeleted = false, isDeactivated = false }: { content: string; isDeleted?: boolean; isDeactivated?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    if (textRef.current && !isExpanded) {
      const lineHeight = 24;
      const maxLines = 5;
      const maxHeight = lineHeight * maxLines;
      setIsTruncated(textRef.current.scrollHeight > maxHeight);
    }
  }, [content, isExpanded]);

  return (
    <div>
      <div
        ref={textRef}
        className={`whitespace-pre-wrap break-words font-outfit ${!isExpanded && isTruncated ? 'line-clamp-5' : ''} ${isDeleted ? 'line-through opacity-60' : ''} ${isDeactivated ? 'opacity-70' : ''}`}
      >
        {parseTextWithLinks(content)}
      </div>
      {isTruncated && !isExpanded && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(true);
          }}
          className="text-xs mt-1 opacity-75 hover:opacity-100 underline font-medium font-outfit"
        >
          Read more
        </button>
      )}
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  isOwnMessage: boolean;
  onMessageUpdated: () => void;
  onReply: (message: Message) => void;
  onScrollToMessage: (messageId: number) => void;
  isActive: boolean;
  onSetActive: (isActive: boolean) => void;
  isLastReadMessage: boolean;
  onImagePreview: (imageUrl: string, altText?: string) => void;
  onJoinEvent?: (eventId: number) => void;
  onGoToEventChat?: (eventId: number, eventName: string) => void;
  optimisticStatus?: 'sending' | 'failed';
  onRetry?: () => void;
  onDelete?: () => void;
  isAdmin?: boolean;
  onMessageInfo?: (messageId: number) => void;
}

export default function MessageBubble({ 
  message, 
  isOwnMessage, 
  onMessageUpdated, 
  onReply, 
  onScrollToMessage, 
  isActive, 
  onSetActive, 
  isLastReadMessage, 
  onImagePreview,
  onJoinEvent,
  onGoToEventChat,
  optimisticStatus,
  onRetry,
  onDelete: onDeleteOptimistic,
  isAdmin = false,
  onMessageInfo
}: MessageBubbleProps) {
  // Debug logging for listing cards
  useEffect(() => {
    if (message.listing_id || message.listing) {
      console.log(`[LISTING_CARD_DEBUG] Message #${message.id}:`, {
        listing_id: message.listing_id,
        has_listing_object: !!message.listing,
        listing: message.listing,
        content_preview: message.content?.substring(0, 50)
      });
    }
  }, [message.id, message.listing_id, message.listing]);

  const [showQuickReactions, setShowQuickReactions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [isDeleting, setIsDeleting] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [barPosition, setBarPosition] = useState<'above' | 'below' | 'fixed-top' | 'fixed-bottom'>('above');
  const [barFixedStyle, setBarFixedStyle] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({});
  const [reactionPopupEmoji, setReactionPopupEmoji] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [menuAbove, setMenuAbove] = useState(true);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const messageContentRef = useRef<HTMLDivElement>(null);
  const lastTapTime = useRef(0);
  const tapTimeout = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const showMobileActionBar = isActive;

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close menu on scroll
  useEffect(() => {
    if (!showMenu) return;
    
    const handleScroll = () => {
      setShowMenu(false);
    };
    
    // Listen on window and capture phase to catch scroll on any parent
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [showMenu]);

  useEffect(() => {
    if (!showMobileActionBar || !containerRef.current) return;

    const calculatePosition = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const headerHeight = 64;
      const footerHeight = 80;
      const viewportHeight = window.innerHeight;
      const barHeight = 48;
      const safeTop = headerHeight + 8;
      const safeBottom = viewportHeight - footerHeight - 8;
      const visibleHeight = safeBottom - safeTop;

      if (rect.height > visibleHeight) {
        const topDistance = Math.abs(rect.top - safeTop);
        const bottomDistance = Math.abs(rect.bottom - safeBottom);
        
        if (topDistance < bottomDistance) {
          setBarPosition('fixed-top');
          setBarFixedStyle({
            top: safeTop,
            [isOwnMessage ? 'right' : 'left']: isOwnMessage ? window.innerWidth - rect.right : rect.left,
          });
        } else {
          setBarPosition('fixed-bottom');
          setBarFixedStyle({
            bottom: footerHeight + 8,
            [isOwnMessage ? 'right' : 'left']: isOwnMessage ? window.innerWidth - rect.right : rect.left,
          });
        }
        return;
      }

      if (rect.top < safeTop && rect.bottom > safeTop + barHeight) {
        setBarPosition('fixed-top');
        setBarFixedStyle({
          top: safeTop,
          [isOwnMessage ? 'right' : 'left']: isOwnMessage ? window.innerWidth - rect.right : rect.left,
        });
        return;
      }

      if (rect.bottom > safeBottom && rect.top < safeBottom - barHeight) {
        setBarPosition('fixed-bottom');
        setBarFixedStyle({
          bottom: footerHeight + 8,
          [isOwnMessage ? 'right' : 'left']: isOwnMessage ? window.innerWidth - rect.right : rect.left,
        });
        return;
      }

      const availableTop = rect.top - safeTop;
      const availableBottom = safeBottom - rect.bottom;
      
      if (availableTop < barHeight && availableBottom >= barHeight) {
        setBarPosition('below');
      } else {
        setBarPosition('above');
      }
    };

    calculatePosition();

    const handleUpdate = () => {
      requestAnimationFrame(calculatePosition);
    };

    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [showMobileActionBar, isOwnMessage]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0 && deltaX < 100) {
        setSwipeOffset(deltaX);
      }
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset > 60) {
      onReply(message);
    }
    setSwipeOffset(0);
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime.current;
    
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      if (tapTimeout.current) {
        clearTimeout(tapTimeout.current);
        tapTimeout.current = null;
      }
      
      if (window.innerWidth < 1024) {
        onSetActive(!isActive);
      }
      
      lastTapTime.current = 0;
    } else {
      lastTapTime.current = now;
    }
  };

  const handleEmojiSelect = async (emoji: string) => {
    try {
      await fetch(`/api/messages/${message.id}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ emoji }),
      });
      onSetActive(false);
      onMessageUpdated();
    } catch (error) {
      console.error("Failed to add reaction:", error);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      // Could add a toast notification here in the future
    } catch (error) {
      console.error("Failed to copy message:", error);
    }
  };

  const handleReactionClick = async (emoji: string) => {
    try {
      await fetch(`/api/messages/${message.id}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ emoji }),
      });
      onMessageUpdated();
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;

    try {
      const response = await fetch(`/api/messages/${message.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ content: editContent.trim() }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to edit message");
        return;
      }

      setIsEditing(false);
      onMessageUpdated();
    } catch (error) {
      console.error("Failed to edit message:", error);
      alert("Failed to edit message");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this message?")) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/messages/${message.id}`, {
        method: "DELETE",
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        setIsDeleting(false);
        alert(error.error || "Failed to delete message");
        return;
      }

      onMessageUpdated();
    } catch (error) {
      console.error("Failed to delete message:", error);
      setIsDeleting(false);
      alert("Failed to delete message");
    }
  };

  const handleAnnounce = async () => {
    const hours = prompt('Create announcement — expires in how many hours? (default: 24)', '24');
    if (hours === null) return; // user cancelled
    const h = parseInt(hours || '24', 10);
    if (isNaN(h) || h < 1) { alert('Invalid duration'); return; }
    try {
      const res = await fetch('/api/admin-reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message_id: message.id, expires_hours: h }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to create announcement');
        return;
      }
      setShowMenu(false);
      onSetActive(false);
      onMessageUpdated();
    } catch (err) {
      console.error('Failed to announce:', err);
      alert('Failed to create announcement');
    }
  };

  const handleTogglePin = async () => {
    try {
      const method = message.is_pinned === 1 ? "DELETE" : "POST";
      const response = await fetch(`/api/messages/${message.id}/pin`, {
        method,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to update pin status");
        return;
      }

      setShowMenu(false);
      onSetActive(false);
      onMessageUpdated();
    } catch (error) {
      console.error("Failed to toggle pin:", error);
      alert("Failed to update pin status");
    }
  };

  const openMenu = (btnRef: React.RefObject<HTMLButtonElement | null>) => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      // If less than 200px above the button, open downward
      setMenuAbove(rect.top > 200);
    }
    setShowMenu(v => !v);
  };

  const canEditOrDelete = () => {
    // SQLite stores timestamps in UTC without timezone indicator
    // Append 'Z' to ensure JavaScript parses it as UTC, not local time
    const utcTimestamp = message.created_at.includes('Z') || message.created_at.includes('+') 
      ? message.created_at 
      : message.created_at.replace(' ', 'T') + 'Z';
    const messageTime = new Date(utcTimestamp).getTime();
    const now = Date.now();
    const timeDiff = now - messageTime;
    const twentyMinutes = 20 * 60 * 1000;
    return timeDiff <= twentyMinutes;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const groupedReactions = (message.reactions || []).reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, Reaction[]>);

  const isUserDeleted = isDeletedUser(message.user_is_deleted);
  const isUserDeactivated = isDeactivatedUser(message.user_is_active, message.user_is_deleted);
  const isUserInactive = isUserDeleted || isUserDeactivated;
  const isWinnerAnnouncement = message.content.startsWith('🎉') && message.content.includes('has won the deal!');
  const isMessageDeleted = message.is_deleted === 1 || message.is_deleted === true;
  const isReminder = message.is_active_announcement === 1 || message.is_active_announcement === true;

  // If message has an event, render EventMessageDisplay
  if (message.event) {
    return (
      <div className={`flex gap-3 w-full ${isOwnMessage ? "flex-row-reverse" : ""}`}>
        {!isOwnMessage && (
          <div className="flex-shrink-0 cursor-pointer" onClick={() => router.push(`/profile/${encodeURIComponent(message.user_id)}`)}>
            {isUserInactive ? (
              <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-slate-400 dark:text-slate-500" />
              </div>
            ) : (
              <img
                src={getUserAvatar(message.user_id, message.user_avatar_url ?? null)}
                alt={message.user_name}
                className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-full border-2 border-white dark:border-dark-ocean shadow-soft object-cover hover:ring-2 hover:ring-primary-mint transition-all"
              />
            )}
          </div>
        )}
        <div className={`flex-1 min-w-0 ${isOwnMessage ? "flex flex-col items-end" : ""}`}>
          {!isOwnMessage && (
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span 
                className={`text-sm font-semibold font-outfit cursor-pointer hover:underline ${isUserInactive ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white'}`}
                onClick={() => router.push(`/profile/${encodeURIComponent(message.user_id)}`)}
              >
                {message.user_name}
              </span>
              {isUserDeleted ? (
                <span className="text-xs text-slate-400 dark:text-slate-500 font-outfit italic">
                  Deleted
                </span>
              ) : isUserDeactivated ? (
                <span className="text-xs text-slate-400 dark:text-slate-500 font-outfit italic">
                  Deactivated
                </span>
              ) : message.user_room_number && (
                <span 
                  className="text-xs text-slate-500 dark:text-slate-400 font-outfit cursor-pointer hover:underline"
                  onClick={() => router.push(`/profile/${encodeURIComponent(message.user_id)}`)}
                >
                  ~{message.user_room_number}
                </span>
              )}
            </div>
          )}
          <EventMessageDisplay event={message.event} onJoinEvent={onJoinEvent} onGoToChat={onGoToEventChat} />
          <div className="text-xs mt-1 flex items-center gap-1 font-outfit">
            <span className="text-slate-400 dark:text-slate-500">{formatTime(message.created_at)}</span>
          </div>
        </div>
      </div>
    );
  }

  // If message has a listing, render ListingMessageDisplay
  if (message.listing) {
    return (
      <div className={`flex gap-3 w-full ${isOwnMessage ? "flex-row-reverse" : ""}`}>
        {!isOwnMessage && (
          <div className="flex-shrink-0 cursor-pointer" onClick={() => router.push(`/profile/${encodeURIComponent(message.user_id)}`)}>
            {isUserInactive ? (
              <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-slate-400 dark:text-slate-500" />
              </div>
            ) : (
              <img
                src={getUserAvatar(message.user_id, message.user_avatar_url ?? null)}
                alt={message.user_name}
                className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-full border-2 border-white dark:border-dark-ocean shadow-soft object-cover hover:ring-2 hover:ring-primary-mint transition-all"
              />
            )}
          </div>
        )}
        <div className={`flex-1 min-w-0 ${isOwnMessage ? "flex flex-col items-end" : ""}`}>
          {!isOwnMessage && (
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span 
                className={`text-sm font-semibold font-outfit cursor-pointer hover:underline ${isUserInactive ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white'}`}
                onClick={() => router.push(`/profile/${encodeURIComponent(message.user_id)}`)}
              >
                {message.user_name}
              </span>
              {isUserDeleted ? (
                <span className="text-xs text-slate-400 dark:text-slate-500 font-outfit italic">
                  Deleted
                </span>
              ) : isUserDeactivated ? (
                <span className="text-xs text-slate-400 dark:text-slate-500 font-outfit italic">
                  Deactivated
                </span>
              ) : message.user_room_number && (
                <span 
                  className="text-xs text-slate-500 dark:text-slate-400 font-outfit cursor-pointer hover:underline"
                  onClick={() => router.push(`/profile/${encodeURIComponent(message.user_id)}`)}
                >
                  ~{message.user_room_number}
                </span>
              )}
            </div>
          )}
          <ListingMessageDisplay 
            listing={message.listing} 
            isCreator={isOwnMessage}
            onListingUpdated={onMessageUpdated}
          />
          <div className="text-xs mt-1 flex items-center gap-1 font-outfit">
            <span className="text-slate-400 dark:text-slate-500">{formatTime(message.created_at)}</span>
          </div>
        </div>
      </div>
    );
  }

  // If message is deleted, show WhatsApp-style "This message has been deleted" placeholder
  if (isMessageDeleted) {
    return (
      <div className={`flex gap-3 w-full ${isOwnMessage ? "flex-row-reverse" : ""}`}>
        {!isOwnMessage && (
          <div className="flex-shrink-0">
            {isUserInactive ? (
              <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-slate-400 dark:text-slate-500" />
              </div>
            ) : (
              <img
                src={getUserAvatar(message.user_id, message.user_avatar_url ?? null)}
                alt={message.user_name}
                className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-full border-2 border-white dark:border-dark-ocean shadow-soft object-cover"
              />
            )}
          </div>
        )}
        <div className={`flex-1 min-w-0 ${isOwnMessage ? "flex flex-col items-end" : ""}`}>
          {!isOwnMessage && (
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-sm font-semibold font-outfit ${isUserInactive ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white'}`}>
                {message.user_name}
              </span>
              {isUserDeleted ? (
                <span className="text-xs text-slate-400 dark:text-slate-500 font-outfit italic">
                  Deleted
                </span>
              ) : isUserDeactivated ? (
                <span className="text-xs text-slate-400 dark:text-slate-500 font-outfit italic">
                  Deactivated
                </span>
              ) : message.user_room_number && (
                <span className="text-xs text-slate-500 dark:text-slate-400 font-outfit">
                  ~{message.user_room_number}
                </span>
              )}
            </div>
          )}
          <div className={`w-fit px-4 py-2 rounded-bubble ${
            isOwnMessage 
              ? "bg-slate-100 dark:bg-dark-elevated rounded-br-md" 
              : "bg-slate-100 dark:bg-dark-elevated rounded-bl-md"
          }`}>
            <span className="text-sm italic text-slate-400 dark:text-slate-500 font-outfit">
              This message has been deleted
            </span>
          </div>
          <div className="text-xs mt-1 flex items-center gap-1 font-outfit">
            <span className="text-slate-400 dark:text-slate-500">{formatTime(message.created_at)}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`flex gap-3 w-full ${isOwnMessage ? "flex-row-reverse" : ""} relative ${showMobileActionBar ? 'z-40' : 'z-0'}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ transform: `translateX(${swipeOffset}px)`, transition: swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none' }}
    >
      {swipeOffset > 0 && (
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 text-primary-mint"
          style={{ opacity: Math.min(swipeOffset / 60, 1) }}
        >
          <Reply className="w-6 h-6" />
        </div>
      )}

      {!isOwnMessage && (
        <div className="flex-shrink-0 cursor-pointer" onClick={() => router.push(`/profile/${encodeURIComponent(message.user_id)}`)}>
          {isUserInactive ? (
            <div className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 lg:w-4 lg:h-4 text-slate-400 dark:text-slate-500" />
            </div>
          ) : (
            <img
              src={getUserAvatar(message.user_id, message.user_avatar_url ?? null)}
              alt={message.user_name}
              className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 rounded-full border-2 border-white dark:border-dark-ocean shadow-soft object-cover hover:ring-2 hover:ring-primary-mint transition-all"
            />
          )}
        </div>
      )}

      <div className={`flex-1 min-w-0 ${isOwnMessage ? "flex flex-col items-end" : ""}`}>
        {!isOwnMessage && (
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span 
              className={`text-sm font-semibold font-outfit cursor-pointer hover:underline ${isUserInactive ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-white'}`}
              onClick={() => router.push(`/profile/${encodeURIComponent(message.user_id)}`)}
            >
              {message.user_name}
            </span>
            {isUserDeleted ? (
              <span className="text-xs text-slate-400 dark:text-slate-500 font-outfit italic">
                Deleted
              </span>
            ) : isUserDeactivated ? (
              <span className="text-xs text-slate-400 dark:text-slate-500 font-outfit italic">
                Deactivated
              </span>
            ) : message.user_room_number && (
              <span 
                className="text-xs text-slate-500 dark:text-slate-400 font-outfit cursor-pointer hover:underline"
                onClick={() => router.push(`/profile/${encodeURIComponent(message.user_id)}`)}
              >
                ~{message.user_room_number}
              </span>
            )}
          </div>
        )}

        <div className={`relative group w-fit ${
          isEditing 
            ? "max-w-[95%] sm:max-w-2xl md:max-w-4xl lg:max-w-6xl" 
            : "max-w-[85%] sm:max-w-[85%] md:max-w-[85%] lg:max-w-xl"
        }`}>
          {/* Mobile/Tablet action bar */}
          {showMobileActionBar && (
            <>
              <div 
                className="fixed inset-0 z-20 lg:hidden" 
                onClick={() => onSetActive(false)}
              />
              <div 
                className={`z-30 lg:hidden ${
                  barPosition === 'fixed-top' || barPosition === 'fixed-bottom' 
                    ? 'fixed' 
                    : 'absolute'
                } ${
                  barPosition === 'above' ? 'bottom-full mb-2' : ''
                } ${
                  barPosition === 'below' ? 'top-full mt-2' : ''
                } ${
                  isOwnMessage ? 'right-0' : 'left-0'
                }`}
                style={barPosition.startsWith('fixed-') ? barFixedStyle : {}}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-button shadow-soft dark:shadow-soft-dark border border-slate-200 dark:border-transparent px-2 py-1.5">
                  {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiSelect(emoji)}
                      className="text-lg hover:scale-110 transition-transform p-1.5"
                      title={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}

                  <div className="w-px h-6 bg-slate-300 dark:bg-slate-600"></div>
                  <div className="relative">
                    <button
                      ref={menuBtnRef}
                      onClick={() => openMenu(menuBtnRef)}
                      className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                      title="More options"
                    >
                      <MoreVertical className="w-4 h-4 text-slate-600 dark:text-white" />
                    </button>

                    {showMenu && (
                      <div className={`absolute ${menuAbove ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 bg-white dark:bg-dark-surface rounded-button-rect shadow-soft dark:shadow-soft-dark border border-slate-200 dark:border-slate-700 py-1 w-32 z-50`}>
                        <button
                          onClick={() => {
                            handleCopy();
                            setShowMenu(false);
                            onSetActive(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-dark-elevated flex items-center gap-2 text-slate-800 dark:text-white"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                        {isOwnMessage && canEditOrDelete() && (
                          <>
                            <button
                              onClick={() => {
                                setIsEditing(true);
                                setShowMenu(false);
                                onSetActive(false);
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-dark-elevated flex items-center gap-2 text-slate-800 dark:text-white"
                            >
                              <Edit2 className="w-3 h-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setShowMenu(false);
                                onSetActive(false);
                                handleDelete();
                              }}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-dark-elevated flex items-center gap-2 text-error"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </>
                        )}
                        {onMessageInfo && message.id > 0 && (
                          <button
                            onClick={() => {
                              setShowMenu(false);
                              onSetActive(false);
                              onMessageInfo(message.id);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-dark-elevated flex items-center gap-2 text-slate-800 dark:text-white"
                          >
                            <Info className="w-3 h-3" />
                            Message Info
                          </button>
                        )}
                        {isAdmin && (
                          <>
                            <button
                              onClick={handleTogglePin}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-dark-elevated flex items-center gap-2 text-slate-800 dark:text-white font-outfit"
                            >
                              <Pin className="w-3 h-3" />
                              {message.is_pinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button
                              onClick={handleAnnounce}
                              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-dark-elevated flex items-center gap-2 text-amber-600 dark:text-amber-400 font-outfit"
                            >
                              <Clock className="w-3 h-3" />
                              Announce
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          <div
            ref={messageContentRef}
            onClick={handleDoubleTap}
            className={`rounded-bubble px-m py-3 cursor-pointer lg:cursor-auto transition-opacity ${
              isDeleting ? 'opacity-50' : 'opacity-100'
            } ${
              isReminder
                ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/20 text-slate-800 dark:text-white border-2 border-amber-300 dark:border-amber-700 shadow-[0_0_12px_rgba(251,191,36,0.25)]"
                : isWinnerAnnouncement
                ? "bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/40 dark:to-yellow-900/30 text-amber-900 dark:text-amber-100 border border-amber-200 dark:border-amber-700/50 shadow-[0_0_20px_rgba(251,191,36,0.3)] dark:shadow-[0_0_20px_rgba(251,191,36,0.2)]"
                : isOwnMessage
                  ? "bg-primary-mint/10 dark:bg-primary-pine text-slate-800 dark:text-white shadow-sm dark:shadow-soft"
                  : isUserInactive
                    ? "bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-soft"
                    : "bg-white dark:bg-dark-surface text-slate-800 dark:text-white border border-slate-100 dark:border-slate-700 shadow-sm dark:shadow-soft"
            }`}
          >
            {message.reply_to_content && message.reply_to_message_id && (
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  onScrollToMessage(message.reply_to_message_id!);
                }}
                className={`mb-2 pb-2 border-l-4 pl-3 ${
                  isOwnMessage 
                    ? "border-primary-mint/30 bg-primary-mint/10 dark:border-white/30 dark:bg-white/10" 
                    : "border-primary-mint bg-primary-mint/10"
                } rounded-r-button-rect py-1.5 cursor-pointer hover:opacity-80 transition-opacity`}
              >
                <div className={`text-xs font-semibold mb-0.5 font-outfit ${
                  isOwnMessage ? "text-primary-mint dark:text-white/90" : "text-primary-mint"
                }`}>
                  {message.reply_to_user_name || ''}
                </div>
                <div 
                  className={`text-xs line-clamp-2 font-outfit ${
                    isOwnMessage ? "text-slate-600 dark:text-white/80" : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {message.reply_to_content || ''}
                </div>
              </div>
            )}
            
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-2 py-1 rounded-button-rect bg-white/20 dark:bg-black/20 text-inherit resize-none outline-none font-outfit focus-ring"
                  rows={6}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleEdit}
                    className="text-xs px-3 py-1 bg-white/20 hover:bg-white/30 rounded-button-rect transition-colors font-outfit"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(message.content);
                    }}
                    className="text-xs px-3 py-1 bg-white/20 hover:bg-white/30 rounded-button-rect transition-colors font-outfit"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <ExpandableText content={message.content} isDeleted={isUserDeleted} isDeactivated={isUserDeactivated} />
            )}

            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.attachments.map((attachment) => (
                  <AttachmentPreview
                    key={attachment.id}
                    attachment={attachment}
                    isOwnMessage={isOwnMessage}
                    onImagePreview={onImagePreview}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Desktop reaction bar */}
          <div className={`hidden lg:block absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
            isOwnMessage ? "-left-4 -translate-x-full" : "-right-4 translate-x-full"
          }`}>
            <div className="flex items-center gap-1 bg-white dark:bg-dark-surface rounded-button shadow-soft dark:shadow-soft-dark border border-slate-200 dark:border-slate-700 px-2 py-1.5">
              <button
                onClick={() => onReply(message)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-dark-elevated transition-colors"
                title="Reply"
              >
                <Reply className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              </button>

              <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>

              {!showQuickReactions ? (
                <button
                  onClick={() => setShowQuickReactions(true)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-dark-elevated transition-colors"
                  title="Add reaction"
                >
                  <Smile className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
              ) : (
                <>
                  {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        handleEmojiSelect(emoji);
                        setShowQuickReactions(false);
                      }}
                      className="text-lg hover:scale-125 transition-transform p-1"
                      title={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </>
              )}

              <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>
              <div className="relative">
                <button
                  ref={menuBtnRef}
                  onClick={() => openMenu(menuBtnRef)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-dark-elevated transition-colors"
                  title="More options"
                >
                  <MoreVertical className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>

                {showMenu && (
                  <div className={`absolute ${menuAbove ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 bg-white dark:bg-dark-surface rounded-button-rect shadow-soft dark:shadow-soft-dark border border-slate-200 dark:border-slate-700 py-1 w-32 z-50`}>
                    <button
                      onClick={() => {
                        handleCopy();
                        setShowMenu(false);
                      }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-dark-elevated flex items-center gap-2 text-slate-800 dark:text-white font-outfit"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                    {isOwnMessage && canEditOrDelete() && (
                      <>
                        <button
                          onClick={() => {
                            setIsEditing(true);
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-dark-elevated flex items-center gap-2 text-slate-800 dark:text-white font-outfit"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setShowMenu(false);
                            handleDelete();
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-dark-elevated flex items-center gap-2 text-error font-outfit"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </>
                    )}
                    {isAdmin && (
                      <>
                        <button
                          onClick={handleTogglePin}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-dark-elevated flex items-center gap-2 text-slate-800 dark:text-white font-outfit"
                        >
                          <Pin className="w-3 h-3" />
                          {message.is_pinned ? 'Unpin' : 'Pin'}
                        </button>
                        <button
                          onClick={handleAnnounce}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-dark-elevated flex items-center gap-2 text-amber-600 dark:text-amber-400 font-outfit"
                        >
                          <Clock className="w-3 h-3" />
                          Announce
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {Object.keys(groupedReactions).length > 0 && (
          <>
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(groupedReactions).map(([emoji, reactions]) => (
                <div key={emoji} className="relative">
                  <button
                    onClick={(e) => {
                      if (isMobile) {
                        // Mobile: show popup on tap
                        e.stopPropagation();
                        setReactionPopupEmoji(reactionPopupEmoji === emoji ? null : emoji);
                      } else {
                        // Desktop: toggle reaction on click
                        handleReactionClick(emoji);
                      }
                    }}
                    onMouseEnter={() => {
                      if (!isMobile) {
                        setReactionPopupEmoji(emoji);
                      }
                    }}
                    onMouseLeave={() => {
                      if (!isMobile) {
                        setReactionPopupEmoji(null);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-button bg-white dark:bg-dark-surface hover:bg-slate-50 dark:hover:bg-dark-elevated shadow-sm border border-slate-200 dark:border-slate-700 transition-colors text-sm"
                  >
                    <span>{emoji}</span>
                    <span className="text-slate-600 dark:text-slate-300 font-medium font-outfit">{reactions.length}</span>
                  </button>
                  {/* Desktop: Popup rendered inside each button's relative container */}
                  {!isMobile && reactionPopupEmoji === emoji && (
                    <ReactionDetailsPopup
                      emoji={emoji}
                      reactions={reactions}
                      isOpen={true}
                      onClose={() => setReactionPopupEmoji(null)}
                      isMobile={isMobile}
                      isOwnMessage={isOwnMessage}
                    />
                  )}
                </div>
              ))}
            </div>
            {/* Mobile: Popup rendered outside loop for inline flow */}
            {isMobile && reactionPopupEmoji && groupedReactions[reactionPopupEmoji] && (
              <ReactionDetailsPopup
                emoji={reactionPopupEmoji}
                reactions={groupedReactions[reactionPopupEmoji]}
                isOpen={true}
                onClose={() => setReactionPopupEmoji(null)}
                isMobile={isMobile}
                isOwnMessage={isOwnMessage}
              />
            )}
          </>
        )}

        {/* Timestamp and badges outside bubble */}
        <div className="text-xs mt-1 flex items-center gap-2 font-outfit">
          {isReminder && (
            <>
              <Clock className="w-3 h-3 text-amber-500 dark:text-amber-400" />
              <span className="text-amber-600 dark:text-amber-400 font-medium">Announcement</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
            </>
          )}
          
          {!!message.is_pinned && (
            <>
              <Pin className="w-3 h-3 text-amber-500 dark:text-amber-400 fill-current" />
              <span className="text-amber-600 dark:text-amber-400 font-medium">Pinned</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
            </>
          )}

          {!!message.is_edited && (
            <>
              <span className="italic text-slate-400 dark:text-slate-500">(edited)</span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
            </>
          )}
          
          <span className="text-slate-400 dark:text-slate-500">{formatTime(message.created_at)}</span>
          
          {/* Optimistic status indicators */}
          {optimisticStatus === 'sending' && (
            <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              Sending...
            </span>
          )}
          
          {optimisticStatus === 'failed' && onRetry && onDeleteOptimistic && (
            <div className="inline-flex items-center gap-2">
              <span className="text-error">Failed to send</span>
              <button
                onClick={onRetry}
                className="px-2 py-1 bg-gradient-primary text-white rounded-button text-xs font-semibold hover:scale-105 transition-transform shadow-soft"
              >
                Retry
              </button>
              <button
                onClick={onDeleteOptimistic}
                className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-button text-xs font-semibold hover:scale-105 transition-transform"
              >
                Delete
              </button>
            </div>
          )}
          
          {isDeleting && (
            <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500">
              <span className="inline-block w-2 h-2 rounded-full bg-error animate-pulse"></span>
              Deleting...
            </span>
          )}
        </div>

        {isOwnMessage && isLastReadMessage && message.reads && message.reads.length > 0 && (
          <div className={`flex items-center gap-1.5 mt-2 ${isOwnMessage ? "justify-end" : ""}`}>
            <div className="flex -space-x-2">
              {message.reads.slice(0, 3).map((read) => (
                <div key={read.id} className="relative" title={read.user_name}>
                  <img
                    src={getUserAvatar(read.user_id, read.user_avatar_url ?? null)}
                    alt={read.user_name}
                    className="w-5 h-5 rounded-full border-2 border-white dark:border-dark-ocean shadow-sm object-cover"
                  />
                </div>
              ))}
            </div>
            {message.reads.length > 3 && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-outfit">
                +{message.reads.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
