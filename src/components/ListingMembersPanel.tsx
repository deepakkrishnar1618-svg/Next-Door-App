import { Circle, X, Crown, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { getUserAvatar, isDeletedUser, isDeactivatedUser } from "@/src/utils/avatars";

interface ListingMember {
  user_id: string;
  name: string;
  avatar_url: string | null;
  room_number: string | null;
  is_creator?: boolean;
  is_admin?: number;
  is_deleted?: number | null;
  is_active?: number | null;
  is_online?: number | boolean;
  last_seen_at?: string | null;
}

interface ListingMembersPanelProps {
  members: ListingMember[];
  currentUserId: string;
  onClose: () => void;
}

export default function ListingMembersPanel({ members, currentUserId, onClose }: ListingMembersPanelProps) {
  const router = useRouter();
  
  // Categorize members: active (online/offline), deactivated, and deleted
  const activeMembers = members.filter(m => !isDeletedUser(m.is_deleted) && !isDeactivatedUser(m.is_active, m.is_deleted));
  const deactivatedMembers = members.filter(m => isDeactivatedUser(m.is_active, m.is_deleted));
  const deletedMembers = members.filter(m => isDeletedUser(m.is_deleted));
  
  const onlineMembers = activeMembers.filter(m => m.is_online === 1 || m.is_online === true);
  const offlineMembers = activeMembers.filter(m => !(m.is_online === 1 || m.is_online === true));

  const renderMember = (member: ListingMember) => {
    const memberIsDeleted = isDeletedUser(member.is_deleted);
    const memberIsDeactivated = isDeactivatedUser(member.is_active, member.is_deleted);
    const isInactive = memberIsDeleted || memberIsDeactivated;
    const isOnline = member.is_online === 1 || member.is_online === true;

    const handleMemberClick = () => {
      if (!memberIsDeleted) {
        router.push(`/profile/${encodeURIComponent(member.user_id)}`);
      }
    };

    return (
      <div
        key={member.user_id}
        className={`flex items-center gap-3 p-2 rounded-button-rect transition-all font-outfit ${
          member.user_id === currentUserId 
            ? "bg-primary-mint/10 dark:bg-primary-mint/20" 
            : "hover:bg-slate-100 dark:hover:bg-dark-elevated"
        } ${isInactive ? "opacity-60" : ""}`}
      >
        <div 
          className={`flex items-center gap-3 flex-1 min-w-0 ${!memberIsDeleted ? "cursor-pointer" : ""}`}
          onClick={handleMemberClick}
        >
          <div className="relative flex-shrink-0">
          {memberIsDeleted ? (
            <div className="w-10 h-10 rounded-full border-2 border-slate-300 dark:border-slate-600 bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-400 dark:text-slate-500" />
            </div>
          ) : (
            <>
              <img
                src={getUserAvatar(member.user_id, member.avatar_url)}
                alt={member.name}
                className={`w-10 h-10 rounded-full border-2 border-white dark:border-dark-ocean shadow-soft object-cover ${
                  memberIsDeactivated ? "opacity-60" : ""
                }`}
              />
              {!isInactive && (
                <Circle className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 ${
                  isOnline 
                    ? "text-success fill-success" 
                    : "text-slate-400 dark:text-slate-500 fill-slate-400 dark:fill-slate-500"
                }`} />
              )}
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className={`text-sm font-medium truncate ${
              isInactive 
                ? "text-slate-500 dark:text-slate-400" 
                : "text-slate-800 dark:text-white"
            }`}>
              {member.name}
            </span>
            {member.is_admin === 1 && (
              <Crown className="w-4 h-4 text-warning flex-shrink-0" />
            )}
            {member.is_creator && !isInactive && (
              <span className="px-2 py-0.5 text-xs font-medium bg-primary-mint/20 text-primary-pine dark:text-primary-mint rounded-full">
                Creator
              </span>
            )}
            {member.user_id === currentUserId && (
              <span className="text-xs text-slate-500 dark:text-slate-400">(you)</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {memberIsDeleted ? (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Deleted
              </span>
            ) : memberIsDeactivated ? (
              <>
                {member.room_number && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Room {member.room_number}
                  </span>
                )}
                <span className="text-xs text-error font-medium">
                  • Deactivated
                </span>
              </>
            ) : (
              member.room_number && (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Room {member.room_number}
                </span>
              )
            )}
          </div>
        </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-dark-ocean">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-dark-ocean border-b border-slate-200 dark:border-slate-700 px-xl py-m z-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white font-nura">
            Members ({activeMembers.length})
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-dark-elevated rounded-button-rect transition-all hover:scale-105"
            >
              <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto px-xl py-m">
          {members.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-m">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-slate-500 dark:text-slate-400 font-outfit">No participants yet</p>
            </div>
          ) : (
            <>
              {/* Online members */}
              {onlineMembers.length > 0 && (
                <div className="mb-xl">
                  <div className="text-sm font-semibold text-success mb-s font-outfit">
                    Online — {onlineMembers.length}
                  </div>
                  <div className="space-y-s">
                    {onlineMembers.map(member => renderMember(member))}
                  </div>
                </div>
              )}

              {/* Offline members */}
              {offlineMembers.length > 0 && (
                <div className="mb-xl">
                  <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-s font-outfit">
                    Offline — {offlineMembers.length}
                  </div>
                  <div className="space-y-s">
                    {offlineMembers.map(member => renderMember(member))}
                  </div>
                </div>
              )}

              {/* Deactivated members */}
              {deactivatedMembers.length > 0 && (
                <div className="mb-xl">
                  <div className="text-sm font-semibold text-error mb-s font-outfit">
                    Deactivated — {deactivatedMembers.length}
                  </div>
                  <div className="space-y-s">
                    {deactivatedMembers.map(member => renderMember(member))}
                  </div>
                </div>
              )}

              {/* Deleted members */}
              {deletedMembers.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-slate-400 dark:text-slate-500 mb-s font-outfit">
                    Deleted — {deletedMembers.length}
                  </div>
                  <div className="space-y-s">
                    {deletedMembers.map(member => renderMember(member))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
    </div>
  );
}
