import { useCallback, useRef } from "react";

// Using a simple, pleasant notification sound
const NOTIFICATION_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const MESSAGE_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/1518/1518-preview.mp3";

export type SoundType = 'notification' | 'message';

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPlayedRef = useRef<number>(0);

  const playSound = useCallback((type: SoundType = 'notification') => {
    // Debounce: don't play sounds more than once per second
    const now = Date.now();
    if (now - lastPlayedRef.current < 1000) {
      return;
    }
    lastPlayedRef.current = now;

    try {
      // Create a new audio element each time for better browser support
      const soundUrl = type === 'message' ? MESSAGE_SOUND_URL : NOTIFICATION_SOUND_URL;
      const audio = new Audio(soundUrl);
      audio.volume = 0.5;
      
      // Store reference for potential cleanup
      audioRef.current = audio;

      // Play the sound
      audio.play().catch((error) => {
        // Autoplay might be blocked by browser - this is expected behavior
        console.debug("Could not play notification sound:", error.message);
      });
    } catch (error) {
      console.debug("Error creating audio:", error);
    }
  }, []);

  return { playSound };
}

// Singleton instance for non-hook contexts (like ToastContext)
let globalAudio: HTMLAudioElement | null = null;
let globalLastPlayed = 0;

export function playNotificationSound(type: SoundType = 'notification') {
  const now = Date.now();
  if (now - globalLastPlayed < 1000) {
    return;
  }
  globalLastPlayed = now;

  try {
    const soundUrl = type === 'message' ? MESSAGE_SOUND_URL : NOTIFICATION_SOUND_URL;
    globalAudio = new Audio(soundUrl);
    globalAudio.volume = 0.5;
    globalAudio.play().catch((error) => {
      console.debug("Could not play notification sound:", error.message);
    });
  } catch (error) {
    console.debug("Error creating audio:", error);
  }
}
