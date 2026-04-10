import { useState, useRef, useEffect } from "react";
import { X, Loader2, Camera, Link as LinkIcon, ExternalLink, Copy, Check } from "lucide-react";
import { getUserAvatar } from "@/src/utils/avatars";
import { useToast } from "@/src/context/ToastContext";

interface CreatorModalProps {
  onClose: () => void;
}

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  room_number: string;
  avatar_url: string | null;
  description: string | null;
  creator_image_url: string | null;
  creator_link: string | null;
  is_admin: boolean;
}

export default function CreatorModal({ onClose }: CreatorModalProps) {
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
  const [description, setDescription] = useState("");
  const [creatorLink, setCreatorLink] = useState("");
  const [creatorImageFile, setCreatorImageFile] = useState<File | null>(null);
  const [creatorImagePreview, setCreatorImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchAdminProfile();
    checkCurrentUserAdmin();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const fetchAdminProfile = async () => {
    try {
      const response = await fetch("/api/profile/admin");
      
      if (response.ok) {
        const data = await response.json();
        setAdminProfile(data);
        setDescription(data.description || "");
        setCreatorLink(data.creator_link || "");
      } else {
        showToast("Failed to load creator profile", "error");
      }
    } catch (error) {
      console.error("Error fetching admin profile:", error);
      showToast("Failed to load creator profile", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const checkCurrentUserAdmin = async () => {
    try {
      const response = await fetch("/api/profile", {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentUserIsAdmin(data.is_admin === 1 || data.is_admin === true);
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCreatorImageFile(file);
      setCreatorImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(adminProfile?.email || '');
      setEmailCopied(true);
      showToast("Email copied to clipboard", "success");
      setTimeout(() => setEmailCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy email:", error);
      showToast("Failed to copy email", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      let creatorImageUrl = adminProfile?.creator_image_url || null;

      // Upload image if selected
      if (creatorImageFile) {
        const formData = new FormData();
        formData.append("file", creatorImageFile);
        formData.append("type", "profile");

        const uploadResponse = await fetch("/api/files", {
          method: "POST",
          body: formData,
          credentials: 'include',
        });

        if (!uploadResponse.ok) throw new Error("Failed to upload image");

        const uploadData = await uploadResponse.json();
        creatorImageUrl = uploadData.url;
      }

      const response = await fetch("/api/profile/admin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          description: description.trim(),
          creator_link: creatorLink.trim(),
          creator_image_url: creatorImageUrl,
        }),
      });

      if (!response.ok) throw new Error("Failed to update profile");

      showToast("Profile updated successfully", "success");
      setCreatorImageFile(null);
      setCreatorImagePreview(null);
      fetchAdminProfile();
    } catch (error) {
      console.error("Profile update error:", error);
      showToast("Failed to update profile. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-dark-ocean">
        <div className="sticky top-0 bg-white dark:bg-dark-ocean border-b border-slate-200 dark:border-slate-700 px-xl py-m z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white font-nura">Creator</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-dark-elevated rounded-button-rect transition-all hover:scale-105"
            >
              <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-mint" />
        </div>
      </div>
    );
  }

  if (!adminProfile) {
    return (
      <div className="h-full flex flex-col bg-white dark:bg-dark-ocean">
        <div className="sticky top-0 bg-white dark:bg-dark-ocean border-b border-slate-200 dark:border-slate-700 px-xl py-m z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white font-nura">Creator</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-dark-elevated rounded-button-rect transition-all hover:scale-105"
            >
              <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-500 dark:text-slate-400 font-outfit">Creator profile not available</p>
        </div>
      </div>
    );
  }

  const avatarUrl = getUserAvatar(adminProfile.id, adminProfile.avatar_url);
  const displayCreatorImage = creatorImagePreview || adminProfile.creator_image_url;

  // Ensure URL has protocol for proper external navigation
  const formatUrl = (url: string) => {
    if (!url) return '';
    const trimmedUrl = url.trim();
    if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
      return trimmedUrl;
    }
    return `https://${trimmedUrl}`;
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (adminProfile?.creator_link) {
      const formattedUrl = formatUrl(adminProfile.creator_link);
      window.open(formattedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-dark-ocean">
      <div className="sticky top-0 bg-white dark:bg-dark-ocean border-b border-slate-200 dark:border-slate-700 px-xl py-m z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-nura">Creator</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-dark-elevated rounded-button-rect transition-all hover:scale-105"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-xl py-xl">
          <form onSubmit={handleSubmit} className="space-y-l">
            {/* Profile Header - More Compact */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt={adminProfile.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
                />
                <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-amber-400 to-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm font-outfit">
                  CREATOR
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white font-nura truncate">{adminProfile.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-outfit">Room {adminProfile.room_number}</p>
              </div>
            </div>

            {/* Contact Information - Compact */}
            <div className="space-y-s">
              {/* About Section - First */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 font-outfit">
                  About {currentUserIsAdmin && "(Optional)"}
                </label>
                
                {currentUserIsAdmin ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description about yourself or the community..."
                    className="w-full px-3 py-2 rounded-button-rect bg-light-surface dark:bg-dark-surface border border-slate-200 dark:border-slate-700 focus:border-primary-mint focus:bg-white dark:focus:bg-dark-elevated outline-none transition-all font-outfit text-sm text-slate-800 dark:text-white resize-none"
                    rows={3}
                  />
                ) : (
                  <div className="px-m py-2 rounded-button-rect bg-light-surface dark:bg-dark-surface border border-slate-200 dark:border-slate-700 min-h-[60px]">
                    <p className="text-sm text-slate-800 dark:text-white font-outfit whitespace-pre-wrap">
                      {adminProfile.description || "No description available"}
                    </p>
                  </div>
                )}
              </div>

              {/* Email Section - Second */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 font-outfit">Email</label>
                <div className="flex items-center gap-2 px-m py-2 rounded-button-rect bg-light-surface dark:bg-dark-surface border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-800 dark:text-white font-outfit break-all flex-1">{adminProfile.email}</p>
                  <button
                    type="button"
                    onClick={handleCopyEmail}
                    className="p-1.5 hover:bg-slate-200 dark:hover:bg-dark-elevated rounded-button-rect transition-all hover:scale-110 flex-shrink-0"
                    title="Copy email"
                  >
                    {emailCopied ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Link Section - Third */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 font-outfit">
                  Link {currentUserIsAdmin && "(Optional)"}
                </label>
                
                {currentUserIsAdmin ? (
                  <input
                    type="url"
                    value={creatorLink}
                    onChange={(e) => setCreatorLink(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 rounded-button-rect bg-light-surface dark:bg-dark-surface border border-slate-200 dark:border-slate-700 focus:border-primary-mint focus:bg-white dark:focus:bg-dark-elevated outline-none transition-all font-outfit text-sm text-slate-800 dark:text-white"
                  />
                ) : (
                  adminProfile.creator_link ? (
                    <button
                      type="button"
                      onClick={handleLinkClick}
                      className="w-full flex items-center gap-2 px-m py-2 rounded-button-rect bg-light-surface dark:bg-dark-surface border border-slate-200 dark:border-slate-700 hover:border-primary-mint transition-all group text-left"
                    >
                      <LinkIcon className="w-4 h-4 text-primary-mint flex-shrink-0" />
                      <span className="text-sm text-slate-800 dark:text-white font-outfit truncate flex-1">{adminProfile.creator_link}</span>
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-primary-mint transition-colors flex-shrink-0" />
                    </button>
                  ) : (
                    <div className="px-m py-2 rounded-button-rect bg-light-surface dark:bg-dark-surface border border-slate-200 dark:border-slate-700">
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-outfit">No link available</p>
                    </div>
                  )
                )}
              </div>

              {/* Image Section - Fourth */}
              {currentUserIsAdmin && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 font-outfit">Image (Optional)</label>
                  <input
                    type="file"
                    ref={imageInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full rounded-button-rect bg-light-surface dark:bg-dark-surface border border-slate-200 dark:border-slate-700 hover:border-primary-mint transition-all overflow-hidden"
                  >
                    {displayCreatorImage ? (
                      <div className="relative group">
                        <img
                          src={displayCreatorImage}
                          alt="Creator"
                          className="w-full h-48 object-contain bg-slate-50 dark:bg-slate-900"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-slate-500 dark:text-slate-400">
                        <Camera className="w-8 h-8 mb-2" />
                        <p className="text-sm font-outfit">Click to upload image</p>
                      </div>
                    )}
                  </button>
                </div>
              )}

              {!currentUserIsAdmin && displayCreatorImage && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 font-outfit">Image</label>
                  <div className="rounded-button-rect overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                    <img
                      src={displayCreatorImage}
                      alt="Creator"
                      className="w-full h-48 object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Save Button - Sticky Footer (Only for Admin) */}
      {currentUserIsAdmin && (
        <div className="sticky bottom-0 bg-white dark:bg-dark-ocean border-t border-slate-200 dark:border-slate-700 px-xl py-m">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-gradient-primary hover:scale-105 text-white font-medium py-3 px-m rounded-button-rect transition-all shadow-soft hover:shadow-soft-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2 font-outfit"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
