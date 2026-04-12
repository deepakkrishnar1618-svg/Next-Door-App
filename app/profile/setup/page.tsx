'use client';

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/src/lib/auth-hook";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Loader2, X } from "lucide-react";
import { getCharacterAvatar, PRESET_AVATARS } from "@/src/utils/avatars";

export default function ProfileSetupPage() {
  const { user, isPending } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToCookies, setAgreedToCookies] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaultAvatar = user ? getCharacterAvatar(user.id) : null;

  useEffect(() => {
    if (!isPending && !user) { router.push("/"); return; }
    if (user) {
      fetch("/api/profile", { credentials: 'include' })
        .then(res => res.json())
        .then(data => { if (data.profile_completed) router.push("/chat"); else setIsLoading(false); })
        .catch(() => setIsLoading(false));
    }
  }, [user, isPending, router]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); setSelectedPreset(null); }
  };

  const handlePresetSelect = (path: string) => {
    setSelectedPreset(path);
    setAvatarFile(null);
    setAvatarPreview(path);
    setShowAvatarPicker(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !roomNumber.trim()) return;
    setIsSubmitting(true);
    try {
      let avatarUrl: string | null = null;
      if (avatarFile) {
        const formData = new FormData();
        formData.append("file", avatarFile);
        formData.append("type", "profile");
        const uploadResponse = await fetch("/api/files", { method: "POST", body: formData, credentials: 'include' });
        if (!uploadResponse.ok) throw new Error("Failed to upload avatar");
        const uploadData = await uploadResponse.json();
        avatarUrl = uploadData.url;
      } else if (selectedPreset) {
        // Use the absolute URL for the preset so it's stored properly
        avatarUrl = `${window.location.origin}${selectedPreset}`;
      }
      const profileData: Record<string, unknown> = { name: name.trim(), room_number: roomNumber.trim() };
      if (avatarUrl) profileData.avatar_url = avatarUrl;
      const response = await fetch("/api/profile", {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: 'include',
        body: JSON.stringify(profileData),
      });
      if (!response.ok) throw new Error("Failed to update profile");
      if (agreedToCookies) localStorage.setItem('cookieConsent', 'accepted');
      router.push("/onboarding");
    } catch (error) {
      console.error("Profile setup error:", error);
      alert("Failed to setup profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = name.trim().length > 0 && roomNumber.trim().length > 0 && agreedToTerms && agreedToCookies;

  if (isPending || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return null;
  const displayAvatar = avatarPreview || defaultAvatar;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 dark:from-dark-ocean dark:via-dark-surface dark:to-dark-elevated flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/95 dark:bg-dark-surface/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-slate-700">
          <div className="flex justify-center mb-6">
            <img src="https://019b6b00-196b-77b5-ae46-bd09bff90213.mochausercontent.com/image.png_3083.png" alt="Next Door" className="w-20 h-20 rounded-2xl shadow-lg" />
          </div>
          <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-primary-mint dark:to-primary-pine bg-clip-text text-transparent font-nura">Edit Profile</h1>
          <p className="text-center text-gray-600 dark:text-slate-300 mb-8 font-outfit">Tell your neighbors about yourself</p>

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
                      onClick={() => handlePresetSelect(av.path)}
                      className={`relative rounded-full overflow-hidden border-2 transition-all aspect-square ${
                        selectedPreset === av.path
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
                  onClick={() => { setShowAvatarPicker(false); fileInputRef.current?.click(); }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:border-emerald-400 hover:text-emerald-600 transition-colors font-outfit"
                >
                  <Camera className="w-4 h-4" />
                  Upload custom photo
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />
              <button type="button" onClick={() => setShowAvatarPicker(true)} className="relative group">
                <img src={displayAvatar!} alt="Avatar" className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-dark-ocean shadow-xl" />
                <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </button>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-2 font-outfit">
                {avatarFile ? "Custom photo selected" : selectedPreset ? "Preset avatar selected" : "Tap to choose an avatar (optional)"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-outfit">Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-elevated border-2 border-transparent focus:border-emerald-500 dark:focus:border-primary-mint text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all font-outfit" placeholder="Enter your full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-outfit">Room Number *</label>
              <input type="text" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-elevated border-2 border-transparent focus:border-emerald-500 dark:focus:border-primary-mint text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all font-outfit" placeholder="e.g., 101, A-203, etc." />
            </div>
            <div className="flex items-start gap-3">
              <input type="checkbox" id="agree-terms" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-1 w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer accent-emerald-500" />
              <label htmlFor="agree-terms" className="text-sm text-gray-600 dark:text-slate-300 font-outfit cursor-pointer">
                I agree to the{" "}
                <Link href="/privacy" target="_blank" className="text-emerald-600 dark:text-primary-mint hover:underline font-medium">Privacy Policy</Link>
                {" "}and{" "}
                <Link href="/terms" target="_blank" className="text-emerald-600 dark:text-primary-mint hover:underline font-medium">Terms of Service</Link>
              </label>
            </div>
            <div className="flex items-start gap-3">
              <input type="checkbox" id="agree-cookies" checked={agreedToCookies} onChange={(e) => setAgreedToCookies(e.target.checked)} className="mt-1 w-5 h-5 rounded border-2 border-slate-300 dark:border-slate-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer accent-emerald-500" />
              <label htmlFor="agree-cookies" className="text-sm text-gray-600 dark:text-slate-300 font-outfit cursor-pointer">
                I agree to{" "}
                <Link href="/cookies" target="_blank" className="text-emerald-600 dark:text-primary-mint hover:underline font-medium">Essential Cookies</Link>
              </label>
            </div>
            <button type="submit" disabled={isSubmitting || !isFormValid} className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-outfit">
              {isSubmitting ? (<><Loader2 className="w-5 h-5 animate-spin" />Setting up...</>) : "Complete Setup"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
