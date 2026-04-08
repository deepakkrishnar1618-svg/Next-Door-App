import { useEffect } from "react";

const BASE_TITLE = "Next Door";

export function useDocumentTitle(unreadCount: number) {
  useEffect(() => {
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) ${BASE_TITLE}`;
    } else {
      document.title = BASE_TITLE;
    }

    // Cleanup: reset title when component unmounts
    return () => {
      document.title = BASE_TITLE;
    };
  }, [unreadCount]);
}
