import { useAuth } from "@/src/lib/auth-hook";
import { useUnreadCount } from "@/src/hooks/useUnreadCount";
import { useDocumentTitle } from "@/src/hooks/useDocumentTitle";

export default function DocumentTitleUpdater() {
  const { user } = useAuth();
  const { unreadCount } = useUnreadCount();

  // Only show unread count in title when user is logged in
  useDocumentTitle(user ? unreadCount : 0);

  return null;
}
