import { X, Download } from "lucide-react";
import { useEffect } from "react";

interface ImagePreviewModalProps {
  imageUrl: string;
  altText?: string;
  onClose: () => void;
}

export default function ImagePreviewModal({ imageUrl, altText, onClose }: ImagePreviewModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [onClose]);

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
    <>
      {/* Backdrop layer - z-[100] */}
      <div
        className="fixed inset-0 z-[100] bg-slate-800/95 dark:bg-slate-900/95"
        onClick={onClose}
      />

      {/* Image container - z-[101] - centered */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center pointer-events-none">
        <div
          className="pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={imageUrl}
            alt={altText || "Preview"}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      </div>

      {/* Action buttons - z-[102] - top right of viewport */}
      <div className="fixed top-6 right-6 z-[102] flex items-center gap-3">
        {/* Download button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          className="p-3.5 bg-dark-ocean/90 hover:bg-dark-ocean backdrop-blur-sm rounded-2xl transition-all hover:scale-105 shadow-lg"
          aria-label="Download image"
        >
          <Download className="w-5 h-5 text-white" />
        </button>

        {/* Close button */}
        <button
          onClick={onClose}
          className="p-3.5 bg-dark-ocean/90 hover:bg-dark-ocean backdrop-blur-sm rounded-2xl transition-all hover:scale-105 shadow-lg"
          aria-label="Close preview"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>
    </>
  );
}
