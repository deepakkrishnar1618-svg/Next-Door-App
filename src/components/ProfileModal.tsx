import { useState, useRef, useEffect } from "react";
import { X, Camera, Loader2, Sun, Moon } from "lucide-react";
import { useTheme } from "@/src/context/ThemeContext";
import { useToast } from "@/src/context/ToastContext";
import { getUserAvatar } from "@/src/utils/avatars";
interface ProfileModalProps {
  onClose: () => void;
}
export default function ProfileModal({
  onClose
}: ProfileModalProps) {
  const [name, setName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const {
    theme,
    toggleTheme
  } = useTheme();
  const {
    showToast
  } = useToast();
  useEffect(() => {
    fetch("/api/profile", {
      credentials: 'include'
    }).then(res => res.json()).then(data => {
      setName(data.name || "");
      setRoomNumber(data.room_number || "");
      setCurrentAvatar(data.avatar_url || null);
      setUserId(data.id || "");
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
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
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roomNumber.trim()) {
      showToast("Please fill in all required fields", "warning");
      return;
    }
    setIsSubmitting(true);
    try {
      let avatarUrl = currentAvatar;
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        formData.append("type", "profile");
        const uploadResponse = await fetch("/api/files", {
          method: "POST",
          body: formData,
          credentials: 'include'
        });
        if (!uploadResponse.ok) throw new Error("Failed to upload avatar");
        const uploadData = await uploadResponse.json();
        avatarUrl = uploadData.url;
      }
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          room_number: roomNumber.trim(),
          avatar_url: avatarUrl
        })
      });
      if (!response.ok) throw new Error("Failed to update profile");
      showToast("Profile updated successfully", "success");
      window.location.reload();
    } catch (error) {
      console.error("Profile update error:", error);
      showToast("Failed to update profile. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };
  const displayAvatar = avatarPreview || (userId ? getUserAvatar(userId, currentAvatar) : null);
  return <div className="h-full flex flex-col bg-white dark:bg-dark-ocean">
      <div className="sticky top-0 bg-white dark:bg-dark-ocean border-b border-slate-200 dark:border-slate-700 px-xl py-m z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-nura">Edit Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-dark-elevated rounded-button-rect transition-all hover:scale-105">
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-xl py-xl">
          {isLoading ? <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary-mint" />
            </div> : <form onSubmit={handleSubmit} className="space-y-l">
              <div className="flex flex-col items-center">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
                
                <button type="button" onClick={() => fileInputRef.current?.click()} className="relative group">
                  {displayAvatar ? <img src={displayAvatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-dark-ocean shadow-soft" /> : <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center border-4 border-white dark:border-dark-ocean shadow-soft">
                      <Camera className="w-8 h-8 text-white" />
                    </div>}
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-s font-outfit">Click to change picture</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-s font-outfit">
                  Full Name
                </label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-m py-2 rounded-button-rect bg-light-surface dark:bg-dark-surface border-2 border-transparent focus:border-primary-mint focus:bg-white dark:focus:bg-dark-elevated outline-none transition-all font-outfit text-slate-800 dark:text-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-s font-outfit">
                  Room Number
                </label>
                <input type="text" value={roomNumber} onChange={e => setRoomNumber(e.target.value)} required className="w-full px-m py-2 rounded-button-rect bg-light-surface dark:bg-dark-surface border-2 border-transparent focus:border-primary-mint focus:bg-white dark:focus:bg-dark-elevated outline-none transition-all font-outfit text-slate-800 dark:text-white" />
              </div>

              <div>
                <button type="button" onClick={toggleTheme} className="w-full flex items-center justify-between px-m py-3 rounded-button-rect bg-light-surface dark:bg-dark-surface hover:bg-slate-100 dark:hover:bg-dark-elevated transition-all">
                  <div className="flex items-center gap-3">
                    {theme === 'light' ? <Sun className="w-5 h-5 text-slate-600 dark:text-slate-300" /> : <Moon className="w-5 h-5 text-slate-600 dark:text-slate-300" />}
                    <span className="text-slate-800 dark:text-white font-medium font-outfit">
                      {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                    </span>
                  </div>
                </button>
              </div>

            </form>}
        </div>

        {!isLoading && <div className="flex items-center justify-center gap-4 px-xl pb-l">
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary-pine dark:hover:text-primary-mint underline transition-colors font-outfit">Privacy</a>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary-pine dark:hover:text-primary-mint underline transition-colors font-outfit">Service</a>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <a href="/cookies" target="_blank" rel="noopener noreferrer" className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary-pine dark:hover:text-primary-mint underline transition-colors font-outfit">Cookies</a>
          </div>}
      </div>

      {!isLoading && <div className="sticky bottom-0 bg-white dark:bg-dark-ocean border-t border-slate-200 dark:border-slate-700 px-xl py-m">
          <button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-gradient-primary hover:scale-105 text-white font-medium py-3 px-m rounded-button-rect transition-all shadow-soft hover:shadow-soft-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 flex items-center justify-center gap-2 font-outfit">
            {isSubmitting ? <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </> : "Save"}
          </button>
        </div>}
    </div>;
}