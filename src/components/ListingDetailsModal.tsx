import { Package, X } from "lucide-react";
import { getUserAvatar } from "@/src/utils/avatars";

interface ListingDetails {
  id: number;
  title: string;
  description: string;
  type: 'offering' | 'requesting';
  is_free: boolean | number;
  price?: number | null;
  status: string;
  creator_user_id: string;
  creator_name?: string;
  creator_avatar?: string;
  images?: Array<{ image_url: string; display_order: number }> | string[];
}

interface ListingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: ListingDetails | null;
}

export default function ListingDetailsModal({ isOpen, onClose, listing }: ListingDetailsModalProps) {
  if (!isOpen || !listing) return null;

  // Get first image URL
  const getFirstImageUrl = () => {
    if (!listing.images || listing.images.length === 0) return null;
    const firstImage = listing.images[0];
    if (typeof firstImage === 'string') return firstImage;
    return firstImage.image_url;
  };

  const firstImageUrl = getFirstImageUrl();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in" onClick={onClose}>
      <div 
        className="w-full max-w-md bg-white dark:bg-dark-ocean rounded-3xl shadow-xl dark:shadow-soft-dark border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto animate-scale-in" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/95 dark:bg-dark-ocean/95 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between rounded-t-3xl z-10">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white font-outfit">Listing Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-button-rect transition-colors"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Listing Image */}
          {firstImageUrl && (
            <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
              <img 
                src={firstImageUrl} 
                alt={listing.title}
                className="w-full h-48 object-cover"
              />
            </div>
          )}

          {/* Title */}
          <div>
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-1">
              <Package className="w-3 h-3" />
              <span className="text-[10px] font-semibold uppercase font-outfit">Title</span>
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white font-outfit">
              {listing.title}
            </h3>
          </div>

          {/* Description */}
          <div>
            <p className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1 font-outfit">Description</p>
            <p className="text-sm text-slate-700 dark:text-slate-300 font-outfit leading-relaxed">
              {listing.description}
            </p>
          </div>

          {/* Posted by */}
          <div>
            <p className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400 mb-2 font-outfit">Posted by</p>
            <div className="flex items-center gap-3">
              <img
                src={getUserAvatar(listing.creator_user_id, listing.creator_avatar || null)}
                alt={listing.creator_name || 'Creator'}
                className="w-10 h-10 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700 shadow-sm"
              />
              <span className="font-medium text-slate-800 dark:text-white font-outfit">
                {listing.creator_name || 'Unknown'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
