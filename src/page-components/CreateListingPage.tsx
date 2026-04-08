'use client';
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, X, Plus, MessageSquarePlus } from "lucide-react";

const MAX_IMAGES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg"];

export default function CreateListingPage() {
  const router = useRouter();
  
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<{ file: File; url: string; uploading: boolean }[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_IMAGES - images.length;
    const filesToUpload = Array.from(files).slice(0, remainingSlots);

    for (const file of filesToUpload) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        alert(`${file.name}: Only PNG and JPEG files are allowed`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name}: File size must be under 5MB`);
        continue;
      }

      // Add to state as uploading
      const tempImage = { file, url: "", uploading: true };
      setImages(prev => [...prev, tempImage]);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", "listing");

        const response = await fetch("/api/files", {
          method: "POST",
          body: formData,
          credentials: "include"
        });

        if (response.ok) {
          const data = await response.json();
          setImages(prev => 
            prev.map(img => 
              img.file === file ? { ...img, url: data.url, uploading: false } : img
            )
          );
        } else {
          alert(`Failed to upload ${file.name}`);
          setImages(prev => prev.filter(img => img.file !== file));
        }
      } catch (error) {
        console.error("Error uploading:", error);
        alert(`Failed to upload ${file.name}`);
        setImages(prev => prev.filter(img => img.file !== file));
      }
    }

    // Reset input
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const isFormValid = () => {
    if (!title.trim()) return false;
    if (!description.trim()) return false;
    if (images.some(img => img.uploading)) return false;
    return true;
  };

  const handleCreateListing = async () => {
    if (!isFormValid()) {
      alert("Please fill in all required fields");
      return;
    }

    setIsCreating(true);
    try {
      const imageUrls = images.map(img => img.url).filter(Boolean);
      
      const response = await fetch("/api/market/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          type: "requesting", // Default type for simplified version
          transaction_type: "buy", // Default transaction type
          is_free: true,
          price: null,
          rental_start_datetime: null,
          rental_end_datetime: null,
          images: imageUrls
        })
      });

      if (response.ok) {
        alert("Request created successfully!");
        router.push("/market?tab=my");
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create request");
      }
    } catch (error) {
      console.error("Error creating request:", error);
      alert("Failed to create request");
    } finally {
      setIsCreating(false);
    }
  };

  const isUploading = images.some(img => img.uploading);

  return (
    <div className="min-h-screen bg-gradient-to-br from-light-bg to-slate-100 dark:from-dark-ocean dark:to-dark-ocean">
      {/* Header */}
      <header className="bg-gradient-primary shadow-soft sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.push("/market")}
            className="p-2.5 rounded-button-rect bg-white/20 hover:bg-white/30 text-white transition-all backdrop-blur-sm hover:scale-105"
            title="Back to Market"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-extrabold text-white tracking-tight font-nura">New Request</h1>
        </div>
      </header>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-dark-surface rounded-2xl p-6 space-y-6">
          
          {/* Title */}
          <div>
            <label className="block text-dark-ocean dark:text-white font-outfit font-medium mb-2">
              What do you need? <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value.slice(0, 12))}
              placeholder="e.g., Ladder, Drill..."
              maxLength={12}
              className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-full text-dark-ocean dark:text-white placeholder-slate-400 font-outfit focus:outline-none focus:border-primary-pine dark:focus:border-primary-mint transition-colors"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-outfit mt-1">{title.length}/12 characters</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-dark-ocean dark:text-white font-outfit font-medium mb-2">
              Details <span className="text-error">*</span>
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value.slice(0, 500))}
              placeholder="Describe what you need, when you need it, or any other details..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 bg-transparent border border-slate-300 dark:border-slate-600 rounded-3xl text-dark-ocean dark:text-white placeholder-slate-400 font-outfit focus:outline-none focus:border-primary-pine dark:focus:border-primary-mint transition-colors resize-none"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-outfit mt-1">{description.length}/500 characters</p>
          </div>

          {/* Images (Optional) */}
          <div>
            <label className="block text-dark-ocean dark:text-white font-outfit font-medium mb-2">
              Images
              <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-2">
                (Optional • {images.length}/{MAX_IMAGES})
              </span>
            </label>
            
            {/* Image Preview Grid */}
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-3">
                {images.map((img, index) => (
                  <div key={index} className="relative aspect-square rounded-xl overflow-hidden border-2 border-slate-200 dark:border-slate-700">
                    {img.uploading ? (
                      <div className="w-full h-full bg-slate-100 dark:bg-dark-elevated flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-primary-mint border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <>
                        <img src={img.url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 p-1.5 bg-error hover:bg-error/90 text-white rounded-full shadow-lg transition-all hover:scale-110"
                          title="Remove image"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add Image Button */}
            {images.length < MAX_IMAGES && (
              <label className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-transparent border border-dashed border-slate-300 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-400 font-outfit cursor-pointer hover:border-primary-pine dark:hover:border-primary-mint transition-colors">
                <Plus className="w-5 h-5" />
                <span>Add Image{images.length === 0 ? "s" : ""}</span>
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg"
                  multiple
                  onChange={handleImageUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 font-outfit mt-2">
              PNG or JPEG • Max 5MB each
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-slate-50 dark:bg-dark-elevated border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
            <div className="bg-primary-pine/20 dark:bg-primary-mint/20 px-4 py-2 border-b border-primary-pine/30 dark:border-primary-mint/30">
              <h3 className="text-primary-pine dark:text-primary-mint font-outfit font-semibold">How it works</h3>
            </div>
            <div className="px-4 py-3 space-y-1">
              <p className="text-slate-600 dark:text-slate-400 text-sm font-outfit">• Your request will be posted to neighbors</p>
              <p className="text-slate-600 dark:text-slate-400 text-sm font-outfit">• Interested neighbors can join a chat to help</p>
              <p className="text-slate-600 dark:text-slate-400 text-sm font-outfit">• You can have up to 5 active requests</p>
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={handleCreateListing}
            disabled={!isFormValid() || isCreating}
            className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-button-rect font-outfit font-semibold transition-all ${
              isFormValid() && !isCreating
                ? "bg-gradient-to-r from-primary-mint to-primary-pine hover:opacity-90 text-white cursor-pointer"
                : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            }`}
          >
            <MessageSquarePlus className="w-5 h-5" />
            {isCreating ? "Creating..." : "Post Request"}
          </button>
        </div>
      </div>
    </div>
  );
}
