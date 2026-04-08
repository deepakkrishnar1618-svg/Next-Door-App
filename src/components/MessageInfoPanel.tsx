import { useState, useEffect } from "react";
import { X, CheckCheck, Check } from "lucide-react";
import { getUserAvatar } from "@/src/utils/avatars";

interface ReadReceipt {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  room_number: string | null;
  read_at: string;
}

interface DeliveredUser {
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  room_number: string | null;
}

interface MessageInfoPanelProps {
  messageId: number;
  onClose: () => void;
  groupType?: "main" | "event";
  eventId?: number;
}

export default function MessageInfoPanel({ 
  messageId, 
  onClose, 
  groupType = "main",
  eventId 
}: MessageInfoPanelProps) {
  const [activeTab, setActiveTab] = useState<"read" | "delivered">("read");
  const [readBy, setReadBy] = useState<ReadReceipt[]>([]);
  const [deliveredTo, setDeliveredTo] = useState<DeliveredUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMessageInfo = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        let url = `/api/messages/${messageId}/info?groupType=${groupType}`;
        if (groupType === "event" && eventId) {
          url += `&eventId=${eventId}`;
        }
        
        const response = await fetch(url, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch message info');
        }
        
        const data = await response.json();
        setReadBy(data.read_by || []);
        setDeliveredTo(data.delivered_to || []);
      } catch (err) {
        setError('Failed to load message info');
        console.error('Failed to fetch message info:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessageInfo();
  }, [messageId, groupType, eventId]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-dark-ocean">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-dark-ocean border-b border-slate-200 dark:border-slate-700 px-xl py-m z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-nura">
            Message Info
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-dark-elevated rounded-button-rect transition-all hover:scale-105"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveTab("read")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === "read"
              ? "text-primary-mint border-b-2 border-primary-mint"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <CheckCheck className="w-4 h-4" />
          Read by ({readBy.length})
        </button>
        <button
          onClick={() => setActiveTab("delivered")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === "delivered"
              ? "text-primary-mint border-b-2 border-primary-mint"
              : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          <Check className="w-4 h-4" />
          Delivered to ({deliveredTo.length})
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-2 border-primary-mint border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-32 text-slate-500 dark:text-slate-400">
            {error}
          </div>
        ) : activeTab === "read" ? (
          // Read by tab
          readBy.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-500 dark:text-slate-400">
              <CheckCheck className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No one has read this message yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {readBy.map((receipt) => (
                <div key={receipt.user_id} className="flex items-center gap-3 px-xl py-m">
                  <img
                    src={getUserAvatar(receipt.avatar_url || '', receipt.name || 'User')}
                    alt={receipt.name || 'User'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white truncate font-outfit">
                        {receipt.name || 'Unknown'}
                      </span>
                      {receipt.room_number && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          ~{receipt.room_number}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <CheckCheck className="w-3 h-3 text-blue-500" />
                      <span>Read {formatTime(receipt.read_at)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          // Delivered to tab
          deliveredTo.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-500 dark:text-slate-400">
              <CheckCheck className="w-8 h-8 mb-2 opacity-50 text-blue-500" />
              <p className="text-sm">Everyone has read this message</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {deliveredTo.map((user) => (
                <div key={user.user_id} className="flex items-center gap-3 px-xl py-m">
                  <img
                    src={getUserAvatar(user.avatar_url || '', user.name || 'User')}
                    alt={user.name || 'User'}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white truncate font-outfit">
                        {user.name || 'Unknown'}
                      </span>
                      {user.room_number && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          ~{user.room_number}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Check className="w-3 h-3 text-slate-400" />
                      <span>Delivered</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
