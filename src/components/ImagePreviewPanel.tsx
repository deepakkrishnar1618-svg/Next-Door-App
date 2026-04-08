import { X, Download } from "lucide-react";

interface ImagePreviewPanelProps {
  imageUrl: string;
  altText?: string;
  onClose: () => void;
}

export default function ImagePreviewPanel({ imageUrl, altText, onClose }: ImagePreviewPanelProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = altText || "image";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-dark-ocean">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-dark-ocean border-b border-slate-200 dark:border-slate-700 px-xl py-m z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-nura">Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-slate-100 dark:hover:bg-dark-elevated rounded-button-rect transition-all hover:scale-105"
              aria-label="Download image"
            >
              <Download className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-dark-elevated rounded-button-rect transition-all hover:scale-105"
            >
              <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Image Container */}
      <div className="flex-1 overflow-y-auto px-xl py-xl">
        <div className="flex items-center justify-center min-h-full">
          <img
            src={imageUrl}
            alt={altText || "Preview"}
            className="max-w-full h-auto object-contain rounded-card shadow-soft dark:shadow-soft-dark"
          />
        </div>
      </div>
    </div>
  );
}
