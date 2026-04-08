import { useEffect, useRef } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onEmojiSelect, onClose }: EmojiPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleSelect = (emoji: any) => {
    onEmojiSelect(emoji.native);
  };

  // Detect dark mode
  const isDarkMode = document.documentElement.classList.contains('dark');

  return (
    <div ref={pickerRef} className="shadow-soft-lg dark:shadow-soft-dark rounded-button-rect overflow-hidden">
      <Picker
        data={data}
        onEmojiSelect={handleSelect}
        theme={isDarkMode ? "dark" : "light"}
        previewPosition="none"
        skinTonePosition="none"
      />
    </div>
  );
}
