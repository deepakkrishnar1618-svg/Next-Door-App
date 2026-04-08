import { Download, FileText, File, Image as ImageIcon, Video, Music, FileArchive } from "lucide-react";

interface AttachmentPreviewProps {
  attachment: {
    id: number;
    filename: string;
    file_key: string;
    file_size: number;
    content_type: string;
  };
  isOwnMessage: boolean;
  onImagePreview: (imageUrl: string, altText?: string) => void;
}

export default function AttachmentPreview({ attachment, isOwnMessage, onImagePreview }: AttachmentPreviewProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileIcon = () => {
    const type = attachment.content_type.toLowerCase();
    
    if (type.startsWith("image/")) return <ImageIcon className="w-5 h-5" />;
    if (type.startsWith("video/")) return <Video className="w-5 h-5" />;
    if (type.startsWith("audio/")) return <Music className="w-5 h-5" />;
    if (type.includes("pdf")) return <FileText className="w-5 h-5" />;
    if (type.includes("zip") || type.includes("rar") || type.includes("7z")) return <FileArchive className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const getFileExtension = () => {
    const parts = attachment.filename.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE";
  };

  // Image attachments
  if (attachment.content_type.startsWith("image/")) {
    return (
      <div 
        className="relative group cursor-pointer rounded-button-rect overflow-hidden shadow-soft dark:shadow-soft-dark hover:shadow-soft-lg dark:hover:shadow-soft-dark transition-all"
        onClick={() => onImagePreview(`/api/files/${attachment.file_key}`, attachment.filename)}
      >
        <img
          src={`/api/files/${attachment.file_key}`}
          alt={attachment.filename}
          className="max-w-full max-h-80 object-cover rounded-button-rect"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-button-rect flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-dark-elevated p-2 rounded-button shadow-soft">
            <ImageIcon className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-button font-outfit">
          {formatFileSize(attachment.file_size)}
        </div>
      </div>
    );
  }

  // Video attachments
  if (attachment.content_type.startsWith("video/")) {
    return (
      <div className="relative rounded-button-rect overflow-hidden shadow-soft dark:shadow-soft-dark">
        <video
          src={`/api/files/${attachment.file_key}`}
          controls
          className="max-w-full max-h-80 rounded-button-rect bg-black"
        />
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-button font-outfit flex items-center gap-1">
          <Video className="w-3 h-3" />
          {formatFileSize(attachment.file_size)}
        </div>
      </div>
    );
  }

  // Audio attachments
  if (attachment.content_type.startsWith("audio/")) {
    return (
      <div className={`rounded-button-rect p-m ${
        isOwnMessage 
          ? "bg-white/10 dark:bg-white/5" 
          : "bg-slate-100 dark:bg-dark-elevated"
      } shadow-soft dark:shadow-soft-dark`}>
        <audio
          src={`/api/files/${attachment.file_key}`}
          controls
          className="w-full max-w-md"
        />
        <div className={`flex items-center gap-2 mt-s text-xs ${
          isOwnMessage ? "text-white/80" : "text-slate-600 dark:text-slate-400"
        } font-outfit`}>
          <Music className="w-3.5 h-3.5" />
          <span className="truncate flex-1">{attachment.filename}</span>
          <span className="flex-shrink-0">{formatFileSize(attachment.file_size)}</span>
        </div>
      </div>
    );
  }

  // PDF and document previews
  if (attachment.content_type.includes("pdf") || 
      attachment.content_type.includes("document") ||
      attachment.content_type.includes("text")) {
    return (
      <a
        href={`/api/files/${attachment.file_key}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-start gap-3 p-m rounded-button-rect ${
          isOwnMessage 
            ? "bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10" 
            : "bg-slate-100 dark:bg-dark-elevated hover:bg-slate-200 dark:hover:bg-slate-700"
        } shadow-soft dark:shadow-soft-dark hover:shadow-soft-lg dark:hover:shadow-soft-dark transition-all group`}
      >
        <div className={`w-12 h-12 rounded-button flex items-center justify-center flex-shrink-0 ${
          isOwnMessage 
            ? "bg-white/20 dark:bg-white/10 text-white" 
            : "bg-primary-mint/10 dark:bg-primary-mint/20 text-primary-mint"
        }`}>
          {getFileIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium truncate mb-1 ${
            isOwnMessage ? "text-white" : "text-slate-800 dark:text-white"
          } font-outfit`}>
            {attachment.filename}
          </div>
          <div className={`text-xs flex items-center gap-2 ${
            isOwnMessage ? "text-white/70" : "text-slate-500 dark:text-slate-400"
          } font-outfit`}>
            <span className="uppercase font-semibold">{getFileExtension()}</span>
            <span>•</span>
            <span>{formatFileSize(attachment.file_size)}</span>
          </div>
        </div>
        <div className={`p-2 rounded-button-rect ${
          isOwnMessage 
            ? "bg-white/10 group-hover:bg-white/20" 
            : "bg-slate-200 dark:bg-dark-ocean group-hover:bg-slate-300 dark:group-hover:bg-slate-600"
        } transition-colors`}>
          <Download className={`w-4 h-4 ${
            isOwnMessage ? "text-white" : "text-slate-600 dark:text-slate-400"
          }`} />
        </div>
      </a>
    );
  }

  // Generic file preview
  return (
    <a
      href={`/api/files/${attachment.file_key}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 p-m rounded-button-rect ${
        isOwnMessage 
          ? "bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10" 
          : "bg-slate-100 dark:bg-dark-elevated hover:bg-slate-200 dark:hover:bg-slate-700"
      } shadow-soft dark:shadow-soft-dark hover:shadow-soft-lg dark:hover:shadow-soft-dark transition-all group`}
    >
      <div className={`p-2 rounded-button ${
        isOwnMessage 
          ? "bg-white/20 dark:bg-white/10 text-white" 
          : "bg-slate-200 dark:bg-dark-ocean text-slate-600 dark:text-slate-400"
      }`}>
        {getFileIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium truncate ${
          isOwnMessage ? "text-white" : "text-slate-800 dark:text-white"
        } font-outfit`}>
          {attachment.filename}
        </div>
        <div className={`text-xs ${
          isOwnMessage ? "text-white/70" : "text-slate-500 dark:text-slate-400"
        } font-outfit`}>
          {formatFileSize(attachment.file_size)}
        </div>
      </div>
      <Download className={`w-4 h-4 ${
        isOwnMessage ? "text-white/70" : "text-slate-400 dark:text-slate-500"
      }`} />
    </a>
  );
}
