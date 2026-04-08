import { useState, useEffect } from 'react';
import { X, Package, User, Trash2, HandHeart, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ListingHistory {
  id: number;
  listing_id: number;
  title: string;
  description: string;
  type: 'offering' | 'requesting';
  transaction_type: 'sale' | 'rent';
  is_free: number;
  price: number | null;
  image_url: string | null;
  creator_user_id: string;
  creator_name: string;
  creator_room: string | null;
  winner_user_id: string | null;
  winner_name: string | null;
  winner_room: string | null;
  helper_user_ids: string | null;
  helper_names: string | null;
  is_deleted: number;
  ended_at: string;
}

// Helper to format helper names from JSON string
function formatHelperNames(helperNamesJson: string | null): string | null {
  if (!helperNamesJson) return null;
  try {
    const names = JSON.parse(helperNamesJson);
    if (Array.isArray(names) && names.length > 0) {
      // Filter out "Unknown" entries
      const validNames = names.filter((name: string) => name && name !== 'Unknown');
      if (validNames.length === 0) return null;
      return validNames.join(', ');
    }
    return null;
  } catch {
    return helperNamesJson;
  }
}

interface ListingHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ListingHistoryPanel({ isOpen, onClose }: ListingHistoryPanelProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [allHistory, setAllHistory] = useState<ListingHistory[]>([]);
  const [myHistory, setMyHistory] = useState<ListingHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const [allRes, myRes] = await Promise.all([
        fetch('/api/market/listings/history'),
        fetch('/api/market/listings/history/my')
      ]);
      
      if (allRes.ok) {
        const data = await allRes.json();
        setAllHistory(data);
      }
      
      if (myRes.ok) {
        const data = await myRes.json();
        setMyHistory(data);
      }
    } catch (error) {
      console.error('Error fetching listing history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const displayHistory = activeTab === 'all' ? allHistory : myHistory;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-dark-ocean">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-dark-ocean border-b border-slate-200 dark:border-slate-700 px-xl py-m z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-nura">Request History</h2>
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
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-3 text-center font-outfit font-medium text-sm transition-colors relative ${
            activeTab === 'all'
              ? 'text-primary-pine dark:text-primary-mint'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          All Requests
          {activeTab === 'all' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-mint" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`flex-1 py-3 text-center font-outfit font-medium text-sm transition-colors relative ${
            activeTab === 'my'
              ? 'text-primary-pine dark:text-primary-mint'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          My Requests
          {activeTab === 'my' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-mint" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-xl py-m space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary-mint/30 border-t-primary-mint rounded-full animate-spin" />
          </div>
        ) : displayHistory.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-outfit">{activeTab === 'all' ? 'No past requests yet' : 'No requests you created or joined'}</p>
          </div>
        ) : (
          displayHistory.map((listing) => (
            <div
              key={listing.id}
              className={`rounded-2xl overflow-hidden ${
                listing.is_deleted
                  ? 'bg-slate-100 dark:bg-slate-800/30 border border-slate-300 dark:border-slate-600'
                  : 'bg-slate-50 dark:bg-dark-elevated'
              }`}
            >
              {/* Listing Image */}
              {listing.image_url && (
                <div className="relative h-24 overflow-hidden">
                  <img
                    src={listing.image_url}
                    alt={listing.title}
                    className={`w-full h-full object-cover ${listing.is_deleted ? 'opacity-50 grayscale' : ''}`}
                  />
                  {listing.is_deleted && (
                    <div className="absolute top-2 right-2 px-2 py-1 bg-red-500/90 text-white text-xs font-medium rounded-lg flex items-center gap-1">
                      <Trash2 className="w-3 h-3" />
                      Deleted
                    </div>
                  )}
                </div>
              )}

              {/* Listing Details */}
              <div className={`p-3 ${listing.is_deleted ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className={`font-semibold text-sm font-outfit ${
                    listing.is_deleted 
                      ? 'text-slate-500 dark:text-slate-400' 
                      : 'text-slate-900 dark:text-white'
                  }`}>
                    {listing.title}
                  </h3>
                  {!listing.image_url && listing.is_deleted && (
                    <span className="px-2 py-0.5 bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium rounded-lg flex items-center gap-1 shrink-0">
                      <Trash2 className="w-3 h-3" />
                      Deleted
                    </span>
                  )}
                </div>
                
                {listing.description && (
                  <p className={`text-xs mb-2 font-outfit ${
                    listing.is_deleted 
                      ? 'text-slate-400 dark:text-slate-500' 
                      : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    {listing.description}
                  </p>
                )}

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <User className="w-3 h-3" />
                    <span className="truncate font-outfit">
                      {listing.creator_name}
                      {listing.creator_room && ` · ${listing.creator_room}`}
                    </span>
                  </div>

                  {formatHelperNames(listing.helper_names) && (
                    <div className="flex items-start gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <HandHeart className="w-3 h-3 mt-0.5 shrink-0" />
                      <span className="font-outfit">
                        Helped by: {formatHelperNames(listing.helper_names)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-500 dark:text-slate-500 font-outfit flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Ended {formatDistanceToNow(new Date(listing.ended_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
