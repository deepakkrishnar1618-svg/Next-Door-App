import { MessageCircle, Users, Hand, MessageSquarePlus } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { MarketListing } from "@/src/lib/types";

interface ListingMessageDisplayProps {
  listing: MarketListing;
  isCreator?: boolean;
  onListingUpdated?: () => void;
}

export default function ListingMessageDisplay({ listing, isCreator = false, onListingUpdated }: ListingMessageDisplayProps) {
  const router = useRouter();
  const [isInterested, setIsInterested] = useState(listing.is_interested === true || listing.is_interested === 1);
  const [isRegistering, setIsRegistering] = useState(false);
  
  useEffect(() => {
    setIsInterested(listing.is_interested === true || listing.is_interested === 1);
  }, [listing.is_interested]);
  
  const images = listing.images || [];
  
  // Check states
  const isListingDeleted = listing.is_deleted === 1 || listing.is_deleted === true;
  const isListingCompleted = listing.is_completed === 1 || listing.is_completed === true;
  const isCreatorDeleted = listing.creator_is_deleted === 1;
  const isCreatorDeactivated = listing.creator_is_active === 0 && !isCreatorDeleted;
  const isUnavailable = isListingDeleted || isCreatorDeleted || isCreatorDeactivated;

  const handleRegisterInterest = async () => {
    if (isRegistering) return;
    setIsRegistering(true);
    try {
      const response = await fetch(`/api/market/listings/${listing.id}/interest`, {
        method: 'POST',
        credentials: 'include',
      });
      if (response.ok) {
        setIsInterested(true);
        onListingUpdated?.();
      }
    } catch (error) {
      console.error('Failed to register interest:', error);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleGoToChat = () => {
    router.push(`/market/${listing.id}/chat`);
  };

  const getActionButton = () => {
    if (isListingDeleted) {
      return (
        <button 
          disabled
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 font-outfit font-medium rounded-xl cursor-not-allowed ${
            isListingCompleted 
              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-slate-400 dark:bg-slate-600 text-slate-200 dark:text-slate-400'
          }`}
        >
          {isListingCompleted ? 'Request Fulfilled ✓' : 'Request Deleted'}
        </button>
      );
    }
    if (isCreatorDeleted) {
      return (
        <button 
          disabled
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-400 dark:bg-slate-600 text-slate-200 dark:text-slate-400 font-outfit font-medium rounded-xl cursor-not-allowed"
        >
          Creator Deleted
        </button>
      );
    }
    if (isCreatorDeactivated) {
      return (
        <button 
          disabled
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-400 dark:bg-slate-600 text-slate-200 dark:text-slate-400 font-outfit font-medium rounded-xl cursor-not-allowed"
        >
          Creator Deactivated
        </button>
      );
    }
    if (isCreator) {
      return (
        <button 
          onClick={handleGoToChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 font-outfit font-medium rounded-xl transition-opacity bg-gradient-to-r from-primary-mint to-primary-pine hover:opacity-90 text-white"
        >
          <MessageCircle className="w-4 h-4" />
          Chat
        </button>
      );
    }
    if (isInterested) {
      return (
        <button 
          onClick={handleGoToChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 font-outfit font-medium rounded-xl transition-opacity bg-gradient-to-r from-primary-mint to-primary-pine hover:opacity-90 text-white"
        >
          <MessageCircle className="w-4 h-4" />
          Go to Chat
        </button>
      );
    }
    return (
      <button 
        onClick={handleRegisterInterest}
        disabled={isRegistering}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 font-outfit font-medium rounded-xl transition-opacity bg-gradient-to-r from-primary-mint to-primary-pine hover:opacity-90 text-white disabled:opacity-50"
      >
        <Hand className="w-4 h-4" />
        {isRegistering ? 'Joining...' : "I Can Help"}
      </button>
    );
  };

  return (
    <div className={`max-w-[85%] sm:max-w-sm rounded-2xl overflow-hidden border transition-all ${
      isUnavailable
        ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
        : 'bg-white dark:bg-dark-surface border-slate-200 dark:border-slate-700 hover:border-primary-mint/50 dark:hover:border-primary-mint/50 hover:shadow-lg'
    }`}>
      {/* Image Section (only if images exist) */}
      {images.length > 0 && !isUnavailable && (
        <div className="relative aspect-[4/3] bg-slate-100 dark:bg-dark-elevated overflow-hidden">
          <img 
            src={images[0]} 
            alt={listing.title}
            className="w-full h-full object-cover"
          />
          {isCreator && (
            <div className="absolute top-2 left-2">
              <span className="px-2 py-0.5 bg-primary-pine/90 text-white text-xs font-medium rounded-full">
                Your Request
              </span>
            </div>
          )}
        </div>
      )}
      
      {/* No image placeholder for unavailable or no-image listings */}
      {(images.length === 0 || isUnavailable) && (
        <div className="aspect-[4/3] bg-slate-100 dark:bg-dark-elevated flex items-center justify-center">
          <MessageSquarePlus className="w-12 h-12 text-slate-300 dark:text-slate-600" />
        </div>
      )}
      
      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-outfit font-semibold text-dark-ocean dark:text-white line-clamp-1">
          {listing.title}
        </h3>
        
        {/* Description */}
        {listing.description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 font-outfit line-clamp-2">
            {listing.description}
          </p>
        )}
        
        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            {listing.creator_avatar ? (
              <img 
                src={listing.creator_avatar} 
                alt={listing.creator_name || "User"}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary-mint to-primary-pine flex items-center justify-center text-white text-xs font-bold">
                {(listing.creator_name || "?").charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400 font-outfit">
              {listing.creator_name || "Unknown"}
              {listing.creator_room && ` · ${listing.creator_room}`}
            </span>
          </div>
          
          {(listing.interested_count ?? 0) > 0 && (
            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
              <Users className="w-3.5 h-3.5" />
              {listing.interested_count} helping
            </div>
          )}
        </div>
        
        {/* Action Button */}
        {getActionButton()}
      </div>
    </div>
  );
}
