import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import ListingMessageBubble, { ListingMessage } from "./ListingMessageBubble";
import { MessageListSkeleton } from "./Skeletons";
import { getUserAvatar } from "@/src/utils/avatars";

interface OptimisticListingMessage extends ListingMessage {
  status: 'sending' | 'failed';
  onRetry: () => void;
  onDelete: () => void;
}

interface ListingMessageListProps {
  messages: ListingMessage[];
  currentUserId: string;
  onMessageUpdated: () => void;
  onReply: (message: ListingMessage) => void;
  onImagePreview: (imageUrl: string, altText?: string) => void;
  optimisticMessages?: OptimisticListingMessage[];
  isLoading?: boolean;
  onMessageInfo?: (messageId: number) => void;
}

export interface ListingMessageListRef {
  scrollToBottom: () => void;
}

const ListingMessageList = forwardRef<ListingMessageListRef, ListingMessageListProps>(({
  messages,
  currentUserId,
  onMessageUpdated,
  onReply,
  onImagePreview,
  optimisticMessages = [],
  isLoading = false,
  onMessageInfo,
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [activeMessageId, setActiveMessageId] = useState<number | null>(null);
  const messageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [hasInitiallyScrolled, setHasInitiallyScrolled] = useState(false);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useImperativeHandle(ref, () => ({ scrollToBottom }), [scrollToBottom]);

  useEffect(() => {
    if (!hasInitiallyScrolled && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
      setHasInitiallyScrolled(true);
    }
  }, [messages.length, hasInitiallyScrolled]);

  const handleScrollToMessage = useCallback((messageId: number) => {
    const messageElement = messageRefs.current.get(messageId);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  }, []);

  const isOwnMessage = (userId: string) => userId === currentUserId;

  const formatDateSeparator = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const getMessageDate = (dateString: string) => new Date(dateString).toDateString();

  const allMessages = [...messages, ...optimisticMessages];

  if (isLoading) {
    return <MessageListSkeleton />;
  }

  if (allMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-3">💬</div>
          <p className="text-slate-500 dark:text-slate-400 font-outfit">
            Kick off the deal by communicating first!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
    >
      {allMessages.map((message, index) => {
        const prevMessage = index > 0 ? allMessages[index - 1] : null;
        const showDateSeparator = !prevMessage || getMessageDate(prevMessage.created_at) !== getMessageDate(message.created_at);

        const isOptimistic = 'status' in message && 'onRetry' in message;
        const optMsg = isOptimistic ? message as OptimisticListingMessage : null;

        const isJoinMessage = 'is_join_message' in message && message.is_join_message;
        const isCreatorJoin = 'is_creator_join' in message && message.is_creator_join;
        const isLeaveMessage = 'is_leave_message' in message && message.is_leave_message;

        return (
          <div 
            key={isOptimistic ? `optimistic-${message.id}` : message.id}
            ref={(el) => { if (el && !isOptimistic) messageRefs.current.set(message.id, el); }}
            className={highlightedMessageId === message.id ? 'animate-pulse bg-primary-mint/20 dark:bg-primary-mint/10 rounded-bubble p-2 -m-2' : ''}
          >
            {showDateSeparator && !isJoinMessage && !isLeaveMessage && (
              <div className="flex items-center justify-center my-6">
                <div className="px-4 py-1.5 bg-slate-100 dark:bg-dark-surface rounded-button text-xs font-medium text-slate-500 dark:text-slate-400 font-outfit">
                  {formatDateSeparator(message.created_at)}
                </div>
              </div>
            )}

            {/* Join message badge */}
            {isJoinMessage && (
              <div className="flex justify-center my-3">
                <div className={`px-4 py-2 rounded-2xl shadow-soft dark:shadow-soft-dark max-w-sm backdrop-blur-sm ${
                  isCreatorJoin 
                    ? 'bg-gradient-to-r from-amber-500/90 to-amber-600/90 dark:from-amber-400/30 dark:to-amber-500/30 border-2 border-amber-600/70 dark:border-amber-400/60' 
                    : 'bg-primary-pine/90 dark:bg-primary-mint/20 border border-primary-pine/70 dark:border-primary-mint/40'
                }`}>
                  <div className="flex items-center gap-3">
                    <img
                      src={getUserAvatar(message.user_id, message.avatar_url)}
                      alt={message.user_name}
                      className={`w-8 h-8 rounded-full object-cover shadow-sm ${
                        isCreatorJoin
                          ? 'border-2 border-amber-400/50'
                          : 'border-2 border-primary-mint/30'
                      }`}
                    />
                    <div>
                      <p className={`text-xs font-medium font-outfit ${
                        isCreatorJoin 
                          ? 'text-white dark:text-amber-400' 
                          : 'text-white dark:text-primary-mint'
                      }`}>
                        <span className="font-semibold">{message.user_name}</span>
                        {message.room_number && (
                          <span className="ml-1.5 px-1.5 py-0.5 bg-white/30 dark:bg-black/20 rounded text-[10px] font-semibold">
                            #{message.room_number}
                          </span>
                        )}
                        {isCreatorJoin ? ' created the request' : ' joined to help'}
                      </p>
                      {isCreatorJoin && (
                        <p className="text-[10px] font-semibold text-white/90 dark:text-amber-400 mt-0.5">
                          REQUEST CREATOR
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Leave message badge */}
            {isLeaveMessage && (
              <div className="flex justify-center my-3">
                <div className="px-4 py-2 rounded-2xl bg-slate-200/80 dark:bg-slate-700/50 border border-slate-300/50 dark:border-slate-600/50 max-w-sm">
                  <div className="flex items-center gap-3">
                    <img
                      src={getUserAvatar(message.user_id, message.avatar_url)}
                      alt={message.user_name}
                      className="w-8 h-8 rounded-full object-cover shadow-sm border-2 border-slate-400/30 grayscale opacity-70"
                    />
                    <div>
                      <p className="text-xs font-medium font-outfit text-slate-500 dark:text-slate-400">
                        <span className="font-semibold">{message.user_name}</span>
                        {message.room_number && (
                          <span className="ml-1.5 px-1.5 py-0.5 bg-slate-300/50 dark:bg-slate-600/50 rounded text-[10px] font-semibold">
                            #{message.room_number}
                          </span>
                        )}
                        {' left the conversation'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Regular message bubble */}
            {!isJoinMessage && !isLeaveMessage && (
              <ListingMessageBubble
                message={message}
                isOwnMessage={isOwnMessage(message.user_id)}
                onMessageUpdated={onMessageUpdated}
                onReply={onReply}
                onScrollToMessage={handleScrollToMessage}
                isActive={activeMessageId === message.id}
                onSetActive={(isActive) => setActiveMessageId(isActive ? message.id : null)}
                onImagePreview={onImagePreview}
                optimisticStatus={optMsg?.status}
                onRetry={optMsg?.onRetry}
                onDelete={optMsg?.onDelete}
                onMessageInfo={onMessageInfo}
              />
            )}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
});

ListingMessageList.displayName = 'ListingMessageList';

export default ListingMessageList;
