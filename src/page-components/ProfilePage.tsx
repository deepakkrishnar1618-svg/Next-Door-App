'use client';
import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/auth-hook";
import { useTheme } from "@/src/context/ThemeContext";
import { getUserAvatar, PRESET_AVATARS } from "@/src/utils/avatars";
import {
  ArrowLeft,
  Edit3,
  Check,
  X,
  Sun,
  Moon,
  MessageSquare,
  Calendar,
  Handshake,
  HandHeart,
  Image as ImageIcon,
  MoreVertical,
  FileText,
  Shield,
  Cookie,
  Download,
  ChevronLeft,
  ChevronRight,
  Images,
  Camera,
} from "lucide-react";

interface ProfileStats {
  messagesSent: number;
  eventsCreated: number;
  eventsAttended: number;
  requestsCreated: number;
  helpedOthers: number;
}

interface ProfileUser {
  id: string;
  name: string;
  avatar_url: string | null;
  room_number: string | null;
  bio: string | null;
  is_admin: boolean;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
}

interface MediaItem {
  id: number;
  url: string;
  filename: string;
  created_at: string;
}

export default function ProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = params?.userId;
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Bio editing state
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioText, setBioText] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);
  
  // Kebab menu state
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Media gallery state
  const [showAllMedia, setShowAllMedia] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // Avatar picker state
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  
  const isOwnProfile = currentUser?.id === userId;
  const BIO_MAX_LENGTH = 500;

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(userId!)}/profile`);
      if (!response.ok) {
        throw new Error("Failed to load profile");
      }
      const data = await response.json();
      setProfileUser(data.user);
      setStats(data.stats);
      setMedia(data.media || []);
      setBioText(data.user.bio || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBio = async () => {
    if (!isOwnProfile) return;
    setIsSavingBio(true);
    try {
      const response = await fetch(`/api/users/${encodeURIComponent(userId!)}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: bioText.trim() }),
      });
      if (!response.ok) throw new Error("Failed to save bio");
      setProfileUser(prev => prev ? { ...prev, bio: bioText.trim() } : null);
      setIsEditingBio(false);
    } catch (err) {
      console.error("Failed to save bio:", err);
    } finally {
      setIsSavingBio(false);
    }
  };

  const handleCancelEdit = () => {
    setBioText(profileUser?.bio || "");
    setIsEditingBio(false);
  };

  const handleAvatarPresetSelect = async (path: string) => {
    setShowAvatarPicker(false);
    setIsUploadingAvatar(true);
    try {
      const avatarUrl = `${window.location.origin}${path}`;
      const response = await fetch(`/api/users/${encodeURIComponent(userId!)}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: avatarUrl }),
      });
      if (!response.ok) throw new Error("Failed to update avatar");
      setProfileUser(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);
    } catch (err) {
      console.error("Failed to update avatar:", err);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setShowAvatarPicker(false);
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "profile");
      const uploadResponse = await fetch("/api/files", { method: "POST", body: formData, credentials: 'include' });
      if (!uploadResponse.ok) throw new Error("Failed to upload avatar");
      const uploadData = await uploadResponse.json();
      const response = await fetch(`/api/users/${encodeURIComponent(userId!)}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatar_url: uploadData.url }),
      });
      if (!response.ok) throw new Error("Failed to update avatar");
      setProfileUser(prev => prev ? { ...prev, avatar_url: uploadData.url } : null);
    } catch (err) {
      console.error("Failed to update avatar:", err);
    } finally {
      setIsUploadingAvatar(false);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const displayedMedia = showAllMedia ? media : media.slice(0, 3);
  const hasMoreMedia = media.length > 3;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-ocean flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-mint border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-ocean flex flex-col items-center justify-center p-4">
        <p className="text-slate-600 dark:text-slate-400 mb-4">{error || "Profile not found"}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-primary-mint text-primary-pine rounded-lg font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

  const avatarUrl = getUserAvatar(profileUser.id, profileUser.avatar_url || null);

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-ocean">
      {/* Avatar picker modal */}
      {showAvatarPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-dark-surface rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold font-outfit text-slate-800 dark:text-white">Choose Avatar</h3>
              <button onClick={() => setShowAvatarPicker(false)} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-dark-elevated transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {PRESET_AVATARS.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => handleAvatarPresetSelect(av.path)}
                  className={`relative rounded-full overflow-hidden border-2 transition-all aspect-square ${
                    profileUser.avatar_url?.includes(av.id)
                      ? 'border-emerald-500 ring-2 ring-emerald-300'
                      : 'border-slate-200 dark:border-slate-600 hover:border-emerald-400'
                  }`}
                  title={av.label}
                >
                  <img src={av.path} alt={av.label} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { setShowAvatarPicker(false); avatarFileInputRef.current?.click(); }}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-600 transition-colors font-outfit"
            >
              <Camera className="w-4 h-4" />
              Upload custom photo
            </button>
          </div>
        </div>
      )}
      <input type="file" ref={avatarFileInputRef} onChange={handleAvatarFileSelect} accept="image/*" className="hidden" />
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-primary px-m py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2.5 rounded-button-rect bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-sm hover:scale-105"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold text-white tracking-tight font-nura">Profile</h1>
              <p className="text-xs text-white/90 font-outfit">{isOwnProfile ? 'Your Space' : 'Friendly Neighbour'}</p>
            </div>
          </div>
          
          {/* Theme Toggle and Menu */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-button-rect bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-sm hover:scale-105"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            
            {/* Kebab Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2.5 rounded-button-rect bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-sm hover:scale-105"
                title="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-dark-elevated rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        router.push('/terms');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-surface transition-colors"
                    >
                      <FileText className="w-5 h-5 text-primary-pine dark:text-primary-mint" />
                      <span className="font-outfit font-medium">Terms of Service</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        router.push('/privacy');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-surface transition-colors"
                    >
                      <Shield className="w-5 h-5 text-primary-pine dark:text-primary-mint" />
                      <span className="font-outfit font-medium">Privacy Policy</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        router.push('/cookies');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-dark-surface transition-colors"
                    >
                      <Cookie className="w-5 h-5 text-primary-pine dark:text-primary-mint" />
                      <span className="font-outfit font-medium">Cookie Policy</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-soft">
          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0">
              <img
                src={avatarUrl}
                alt={profileUser.name || "User"}
                className={`w-20 h-20 rounded-full object-cover border-2 border-primary-mint/30 ${isOwnProfile ? 'cursor-pointer' : ''}`}
                onClick={() => isOwnProfile && setShowAvatarPicker(true)}
              />
              {isOwnProfile && (
                <button
                  onClick={() => setShowAvatarPicker(true)}
                  className="absolute bottom-0 right-0 w-7 h-7 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center shadow-md transition-colors"
                  title="Change avatar"
                >
                  {isUploadingAvatar
                    ? <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    : <Camera className="w-3.5 h-3.5 text-white" />
                  }
                </button>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white font-nura truncate">
                  {profileUser.name || "Unknown User"}
                </h2>
                {profileUser.is_admin && (
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                    Admin
                  </span>
                )}
                {!profileUser.is_active && (
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-medium rounded-full">
                    {profileUser.is_deleted ? "Deleted" : "Deactivated"}
                  </span>
                )}
              </div>
              {profileUser.room_number && (
                <p className="text-primary-pine dark:text-primary-mint font-medium mt-1">
                  Room {profileUser.room_number}
                </p>
              )}
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Member since {new Date(profileUser.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>

        {/* Bio Section */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white font-nura">About</h3>
            {isOwnProfile && !isEditingBio && (
              <button
                onClick={() => setIsEditingBio(true)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-dark-elevated rounded-full transition-colors"
              >
                <Edit3 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              </button>
            )}
          </div>
          
          {isEditingBio ? (
            <div className="space-y-3">
              <textarea
                value={bioText}
                onChange={(e) => setBioText(e.target.value.slice(0, BIO_MAX_LENGTH))}
                placeholder="Tell your neighbors about yourself..."
                className="w-full h-32 px-4 py-3 bg-light-surface dark:bg-dark-elevated rounded-xl text-slate-800 dark:text-white placeholder-slate-400 resize-none outline-none focus:ring-2 focus:ring-primary-mint/50 transition-all font-outfit"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  {bioText.length}/{BIO_MAX_LENGTH}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancelEdit}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-dark-elevated rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-500" />
                  </button>
                  <button
                    onClick={handleSaveBio}
                    disabled={isSavingBio}
                    className="p-2 bg-primary-mint hover:bg-primary-mint/90 rounded-full transition-colors disabled:opacity-50"
                  >
                    <Check className="w-5 h-5 text-primary-pine" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-slate-600 dark:text-slate-300 font-outfit whitespace-pre-wrap">
              {profileUser.bio || (isOwnProfile ? "Add a bio to tell your neighbors about yourself." : "No bio yet.")}
            </p>
          )}
        </div>

        {/* Stats Section */}
        {stats && (
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white font-nura mb-4">Activity</h3>
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                icon={<MessageSquare className="w-5 h-5" />}
                label="Messages"
                value={stats.messagesSent}
                color="mint"
              />
              <StatCard
                icon={<Calendar className="w-5 h-5" />}
                label="Events Created"
                value={stats.eventsCreated}
                color="amber"
              />
              <StatCard
                icon={<Calendar className="w-5 h-5" />}
                label="Events Attended"
                value={stats.eventsAttended}
                color="cyan"
              />
              <StatCard
                icon={<Handshake className="w-5 h-5" />}
                label="Requests Created"
                value={stats.requestsCreated}
                color="blue"
              />
              <StatCard
                icon={<HandHeart className="w-5 h-5" />}
                label="Helped Others"
                value={stats.helpedOthers}
                color="emerald"
              />
            </div>
          </div>
        )}

        {/* Media Gallery */}
        <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white font-nura">
              Shared Media
            </h3>
            {hasMoreMedia && (
              <button
                onClick={() => setShowAllMedia(!showAllMedia)}
                className="text-sm text-primary-pine dark:text-primary-mint font-medium flex items-center gap-1 hover:underline"
              >
                <Images className="w-4 h-4" />
                {showAllMedia ? 'Show less' : `View all (${media.length})`}
              </button>
            )}
          </div>
          {media.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {displayedMedia.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => setPreviewIndex(showAllMedia ? index : index)}
                  className="aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-dark-elevated cursor-pointer relative group"
                >
                  <img
                    src={item.url}
                    alt={item.filename}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {/* Show +N overlay on 3rd image if there are more */}
                  {!showAllMedia && index === 2 && hasMoreMedia && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">+{media.length - 3}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
              <p className="text-sm">No shared media yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Panel */}
      {previewIndex !== null && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setPreviewIndex(null)}
          />
          
          {/* Side Panel */}
          <div className="fixed top-0 right-0 h-full w-full sm:w-96 md:w-[480px] z-50 bg-white dark:bg-dark-ocean shadow-xl flex flex-col">
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-dark-ocean border-b border-slate-200 dark:border-slate-700 px-4 py-3 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white font-nura">Preview</h2>
                <div className="flex items-center gap-2">
                  {/* Navigation arrows */}
                  <button
                    onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                    disabled={previewIndex === 0}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-dark-elevated rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                  <span className="text-sm text-slate-500 dark:text-slate-400 min-w-[50px] text-center">
                    {previewIndex + 1} / {media.length}
                  </span>
                  <button
                    onClick={() => setPreviewIndex(Math.min(media.length - 1, previewIndex + 1))}
                    disabled={previewIndex === media.length - 1}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-dark-elevated rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                  <button
                    onClick={() => handleDownload(media[previewIndex].url, media[previewIndex].filename)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-dark-elevated rounded-lg transition-all hover:scale-105"
                    aria-label="Download image"
                  >
                    <Download className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                  <button
                    onClick={() => setPreviewIndex(null)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-dark-elevated rounded-lg transition-all hover:scale-105"
                  >
                    <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Image Container */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-center min-h-full">
                <img
                  src={media[previewIndex].url}
                  alt={media[previewIndex].filename}
                  className="max-w-full h-auto object-contain rounded-xl shadow-soft dark:shadow-soft-dark"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'mint' | 'amber' | 'cyan' | 'blue' | 'emerald';
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  const colorClasses = {
    mint: 'bg-primary-mint/10 text-primary-mint',
    amber: 'bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    cyan: 'bg-cyan-100 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400',
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-light-surface dark:bg-dark-elevated">
      <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-slate-800 dark:text-white font-nura">{value}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}
