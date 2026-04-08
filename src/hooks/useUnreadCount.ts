import { useState, useEffect, useRef } from "react";

export function useUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const prevCountRef = useRef<number>(0);
  const isInitialFetchRef = useRef(true);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch("/api/messages/unread/count", { credentials: 'include' });
      if (!response.ok) throw new Error("Failed to fetch unread count");
      const data = await response.json();
      
      prevCountRef.current = data.count;
      isInitialFetchRef.current = false;
      setUnreadCount(data.count);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    // Poll for updates every 5 seconds
    const interval = setInterval(fetchUnreadCount, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    unreadCount,
    refetch: fetchUnreadCount,
  };
}
