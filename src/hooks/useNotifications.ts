import { useState, useEffect, useRef } from "react";

export function useNotifications(unreadMessageCount: number = 0, groupId?: string) {
  const [unreadMentionCount, setUnreadMentionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const prevCountRef = useRef<number>(0);
  const isInitialFetchRef = useRef(true);

  const fetchUnreadCount = async () => {
    try {
      const url = groupId 
        ? `/api/notifications/unread/count?group_id=${encodeURIComponent(groupId)}`
        : "/api/notifications/unread/count";
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) throw new Error("Failed to fetch unread count");
      const data = await response.json();
      
      prevCountRef.current = data.count;
      isInitialFetchRef.current = false;
      setUnreadMentionCount(data.count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    // Poll for new notifications every 10 seconds
    const interval = setInterval(fetchUnreadCount, 10000);

    return () => clearInterval(interval);
  }, [groupId]);

  // Total count includes mentions + unread messages indicator (max 1)
  const totalCount = unreadMentionCount + (unreadMessageCount > 0 ? 1 : 0);

  return {
    unreadCount: totalCount,
    unreadMentionCount,
    isLoading,
    refetch: fetchUnreadCount,
  };
}
