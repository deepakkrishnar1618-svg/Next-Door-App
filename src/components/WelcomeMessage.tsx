import { useEffect } from "react";
import { getUserAvatar } from "@/src/utils/avatars";

interface WelcomeMessageProps {
  name: string;
  roomNumber: string;
  avatarUrl: string | null;
  userId: string;
}

export default function WelcomeMessage({ name, roomNumber, avatarUrl, userId }: WelcomeMessageProps) {
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);
  
  return (
    <div className="flex justify-center my-3">
      <div className="bg-primary-mint/10 dark:bg-primary-mint/20 border border-primary-mint/30 dark:border-primary-mint/40 text-primary-mint px-m py-2 rounded-button-rect shadow-soft dark:shadow-soft-dark max-w-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <img
            src={getUserAvatar(userId, avatarUrl)}
            alt={name}
            className="w-8 h-8 rounded-full border-2 border-primary-mint/30 object-cover shadow-sm"
          />
          <div>
            <p className="text-xs font-medium font-outfit">
              <span className="font-semibold">{name}</span> from{" "}
              <span className="font-semibold">Room {roomNumber}</span>
            </p>
            <p className="text-xs text-primary-pine dark:text-primary-mint font-outfit">
              joined <span className="font-nura font-extrabold">Next Door</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
