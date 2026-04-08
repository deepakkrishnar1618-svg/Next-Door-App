import { useState, useEffect, useCallback, useRef } from "react";
import type { Message, SystemMessage } from "@/src/lib/types";

type MessageOrSystem = Message | SystemMessage;

export function useMessages(groupId?: string | null) {
  const [messages, setMessages] = useState<MessageOrSystem[]>([]);
  const [lastReadMessageId, setLastReadMessageId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const previousMessagesRef = useRef<MessageOrSystem[]>([]);

  const fetchMessages = useCallback(async () => {
    try {
      const url = groupId ? `/api/messages?group_id=${encodeURIComponent(groupId)}` : "/api/messages";
      console.log(`[useMessages] Fetching from: ${url}`);
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        console.error(`[useMessages] Response not OK: ${response.status} ${response.statusText}`);
        throw new Error("Failed to fetch messages");
      }
      const data = await response.json();
      console.log(`[useMessages] Received data:`, data);
      
      // Log listing debug info from backend
      if (data._listingDebug) {
        console.log(`[LISTING_DEBUG_BACKEND] Backend listing info:`, data._listingDebug);
      }
      
      // Ensure we always have an array
      const messageArray = data.messages || data;
      if (!Array.isArray(messageArray)) {
        console.error(`[useMessages] Expected array but got:`, typeof messageArray, messageArray);
        // On error, keep previous messages instead of clearing
        // Only clear if this is the initial load
        if (!hasInitiallyLoaded) {
          setMessages([]);
        }
      } else {
        console.log(`[useMessages] Messages array length:`, messageArray.length);
        
        // Debug logging for listing cards
        const messagesWithListings = messageArray.filter((m: Message | SystemMessage) => 
          (m as Message).listing_id || (m as Message).listing
        );
        if (messagesWithListings.length > 0) {
          console.log(`[LISTING_CARD_DEBUG] Messages with listing data:`, messagesWithListings.map((m: Message | SystemMessage) => ({
            message_id: m.id,
            listing_id: (m as Message).listing_id,
            has_listing_object: !!(m as Message).listing,
            listing_title: (m as Message).listing?.title,
            content_preview: (m as Message).content?.substring(0, 50)
          })));
        } else {
          console.log(`[LISTING_CARD_DEBUG] No messages have listing data attached`);
        }
        
        setMessages(messageArray);
        previousMessagesRef.current = messageArray;
      }
      
      setLastReadMessageId(data.last_read_message_id || null);
      setHasInitiallyLoaded(true);
    } catch (error) {
      console.error("[useMessages] Error fetching messages:", error);
      // On error during polling, keep previous messages visible
      // Only set empty array if this is the first load attempt
      if (!hasInitiallyLoaded) {
        setMessages([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [groupId, hasInitiallyLoaded]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    lastReadMessageId,
    isLoading,
    hasInitiallyLoaded,
    refetch: fetchMessages,
  };
}
