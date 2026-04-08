import { getUserAvatar } from "@/src/utils/avatars";

interface UserRemovedMessageProps {
  name: string;
  roomNumber: string;
  avatarUrl: string | null;
  userId: string;
  isDeleted: boolean; // true = deleted, false = deactivated/blocked
}

export default function UserRemovedMessage({ 
  name, 
  roomNumber, 
  avatarUrl, 
  userId, 
  isDeleted 
}: UserRemovedMessageProps) {
  return (
    <div className="flex justify-center my-3">
      <div className="bg-muted/50 dark:bg-muted/30 border border-border text-muted-foreground px-m py-2 rounded-button-rect shadow-soft dark:shadow-soft-dark max-w-sm backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <img
            src={getUserAvatar(userId, avatarUrl)}
            alt={name}
            className="w-8 h-8 rounded-full border-2 border-border object-cover shadow-sm grayscale opacity-70"
          />
          <div>
            <p className="text-xs font-medium font-outfit">
              <span className="font-semibold">{name}</span> from{" "}
              <span className="font-semibold">Room {roomNumber}</span>
            </p>
            <p className="text-xs text-muted-foreground/80 font-outfit">
              {isDeleted ? 'account deleted' : 'account blocked'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
