import { useState, useRef, useEffect } from "react";
import { MoreVertical, Settings, ShieldAlert, LogOut, Search, Users, X, Check, HelpCircle, Crown, Trash2 } from "lucide-react";

interface HeaderMenuProps {
  isAdmin: boolean;
  userCount: number;
  onEditProfile: () => void;
  onAdminSettings: () => void;
  onSearch: () => void;
  onToggleUserList: () => void;
  onLogout: () => void;
  onShowOnboarding?: () => void;
  onShowCreator?: () => void;
  isEventChat?: boolean;
  onExitEvent?: () => void;
  onDeleteEvent?: () => void;
  isEventCreator?: boolean;
  // Listing chat props
  isListingChat?: boolean;
  onExitListing?: () => void;
  onDeleteListing?: () => void;
  isListingCreator?: boolean;
}

export default function HeaderMenu({ isAdmin, userCount, onEditProfile, onAdminSettings, onSearch, onToggleUserList, onLogout, onShowOnboarding, onShowCreator, isEventChat, onExitEvent, onDeleteEvent, isEventCreator, isListingChat, onExitListing, onDeleteListing, isListingCreator }: HeaderMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showExitListingConfirm, setShowExitListingConfirm] = useState(false);
  const [showDeleteListingConfirm, setShowDeleteListingConfirm] = useState(false);
  const [deleteListingConfirmText, setDeleteListingConfirmText] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close menu on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener("scroll", handleScroll, true);
    }

    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [isOpen]);

  const handleMenuClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-button-rect hover:bg-white/20 text-white transition-all hover:scale-105"
        title="Menu"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-dark-surface rounded-card shadow-soft dark:shadow-soft-dark border border-slate-200 dark:border-slate-700 overflow-hidden z-[70] animate-scale-in">
          <button
            onClick={() => handleMenuClick(onToggleUserList)}
            className="w-full flex items-center gap-3 px-m py-3 hover:bg-slate-50 dark:hover:bg-dark-elevated transition-colors text-left"
          >
            <Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <span className="text-slate-800 dark:text-white font-medium font-outfit">Members ({userCount})</span>
          </button>

          {!isEventChat && !isListingChat && (
            <button
              onClick={() => handleMenuClick(onSearch)}
              className="w-full flex items-center gap-3 px-m py-3 hover:bg-slate-50 dark:hover:bg-dark-elevated transition-colors text-left border-t border-slate-100 dark:border-slate-700"
            >
              <Search className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span className="text-slate-800 dark:text-white font-medium font-outfit">Search Messages</span>
            </button>
          )}

          {!isEventChat && isAdmin && (
            <button
              onClick={() => handleMenuClick(onAdminSettings)}
              className="w-full flex items-center gap-3 px-m py-3 hover:bg-slate-50 dark:hover:bg-dark-elevated transition-colors text-left border-t border-slate-100 dark:border-slate-700"
            >
              <ShieldAlert className="w-5 h-5 text-primary-mint" />
              <span className="text-slate-800 dark:text-white font-medium font-outfit">Admin Settings</span>
            </button>
          )}
          
          {!isEventChat && !isListingChat && (
            <button
              onClick={() => handleMenuClick(onEditProfile)}
              className="w-full flex items-center gap-3 px-m py-3 hover:bg-slate-50 dark:hover:bg-dark-elevated transition-colors text-left border-t border-slate-100 dark:border-slate-700"
            >
              <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <span className="text-slate-800 dark:text-white font-medium font-outfit">Edit Profile</span>
            </button>
          )}

          {isEventChat && isEventCreator && onDeleteEvent ? (
            showDeleteConfirm ? (
              <div className="border-t border-slate-100 dark:border-slate-700 p-m">
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 font-outfit font-semibold">
                  Delete this event?
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 font-outfit">
                  Type "delete" to confirm
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder='Type "delete"'
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-button-rect bg-white dark:bg-dark-elevated text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm font-outfit mb-3 focus:outline-none focus:ring-2 focus:ring-error"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText("");
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-m py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-button-rect transition-colors font-outfit"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (deleteConfirmText === "delete") {
                        onDeleteEvent();
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText("");
                        setIsOpen(false);
                      }
                    }}
                    disabled={deleteConfirmText !== "delete"}
                    className="flex-1 flex items-center justify-center gap-2 px-m py-2 bg-error hover:bg-error/90 text-white rounded-button-rect transition-colors font-outfit disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-3 px-m py-3 hover:bg-slate-50 dark:hover:bg-dark-elevated transition-colors text-left border-t border-slate-100 dark:border-slate-700"
              >
                <LogOut className="w-5 h-5 text-error" />
                <span className="text-slate-800 dark:text-white font-medium font-outfit">Delete Event</span>
              </button>
            )
          ) : isEventChat && onExitEvent ? (
            showExitConfirm ? (
              <div className="border-t border-slate-100 dark:border-slate-700 p-m">
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 font-outfit">
                  Are you sure you want to exit this event?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowExitConfirm(false)}
                    className="flex-1 flex items-center justify-center gap-2 px-m py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-button-rect transition-colors font-outfit"
                  >
                    <X className="w-4 h-4" />
                    No
                  </button>
                  <button
                    onClick={() => {
                      onExitEvent();
                      setShowExitConfirm(false);
                      setIsOpen(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-m py-2 bg-error hover:bg-error/90 text-white rounded-button-rect transition-colors font-outfit"
                  >
                    <Check className="w-4 h-4" />
                    Yes
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowExitConfirm(true)}
                className="w-full flex items-center gap-3 px-m py-3 hover:bg-slate-50 dark:hover:bg-dark-elevated transition-colors text-left border-t border-slate-100 dark:border-slate-700"
              >
                <LogOut className="w-5 h-5 text-error" />
                <span className="text-slate-800 dark:text-white font-medium font-outfit">Exit Event</span>
              </button>
            )
          ) : isListingChat && isListingCreator && onDeleteListing ? (
            showDeleteListingConfirm ? (
              <div className="border-t border-slate-100 dark:border-slate-700 p-m">
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-2 font-outfit font-semibold">
                  Delete this listing?
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-3 font-outfit">
                  Type "delete" to confirm
                </p>
                <input
                  type="text"
                  value={deleteListingConfirmText}
                  onChange={(e) => setDeleteListingConfirmText(e.target.value)}
                  placeholder='Type "delete"'
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-button-rect bg-white dark:bg-dark-elevated text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm font-outfit mb-3 focus:outline-none focus:ring-2 focus:ring-error"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowDeleteListingConfirm(false);
                      setDeleteListingConfirmText("");
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-m py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-button-rect transition-colors font-outfit"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (deleteListingConfirmText === "delete") {
                        onDeleteListing();
                        setShowDeleteListingConfirm(false);
                        setDeleteListingConfirmText("");
                        setIsOpen(false);
                      }
                    }}
                    disabled={deleteListingConfirmText !== "delete"}
                    className="flex-1 flex items-center justify-center gap-2 px-m py-2 bg-error hover:bg-error/90 text-white rounded-button-rect transition-colors font-outfit disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Check className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ) : (
<button
                  onClick={() => setShowDeleteListingConfirm(true)}
                  className="w-full flex items-center gap-3 px-m py-3 hover:bg-slate-50 dark:hover:bg-dark-elevated transition-colors text-left border-t border-slate-100 dark:border-slate-700"
                >
                  <Trash2 className="w-5 h-5 text-error" />
                  <span className="text-slate-800 dark:text-white font-medium font-outfit">Delete Listing</span>
                </button>
            )
          ) : isListingChat && onExitListing ? (
            showExitListingConfirm ? (
              <div className="border-t border-slate-100 dark:border-slate-700 p-m">
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 font-outfit">
                  Are you sure you want to exit this listing chat?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowExitListingConfirm(false)}
                    className="flex-1 flex items-center justify-center gap-2 px-m py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white rounded-button-rect transition-colors font-outfit"
                  >
                    <X className="w-4 h-4" />
                    No
                  </button>
                  <button
                    onClick={() => {
                      onExitListing();
                      setShowExitListingConfirm(false);
                      setIsOpen(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-m py-2 bg-error hover:bg-error/90 text-white rounded-button-rect transition-colors font-outfit"
                  >
                    <Check className="w-4 h-4" />
                    Yes
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowExitListingConfirm(true)}
                className="w-full flex items-center gap-3 px-m py-3 hover:bg-slate-50 dark:hover:bg-dark-elevated transition-colors text-left border-t border-slate-100 dark:border-slate-700"
              >
                <LogOut className="w-5 h-5 text-error" />
                <span className="text-slate-800 dark:text-white font-medium font-outfit">Exit Listing</span>
              </button>
            )
          ) : (
            <>
              {!isEventChat && !isListingChat && onShowCreator && (
                <button
                  onClick={() => handleMenuClick(onShowCreator)}
                  className="w-full flex items-center gap-3 px-m py-3 hover:bg-slate-50 dark:hover:bg-dark-elevated transition-colors text-left border-t border-slate-100 dark:border-slate-700"
                >
                  <Crown className="w-5 h-5 text-amber-500" />
                  <span className="text-slate-800 dark:text-white font-medium font-outfit">Creator Profile</span>
                </button>
              )}
              {!isEventChat && !isListingChat && onShowOnboarding && (
                <button
                  onClick={() => handleMenuClick(onShowOnboarding)}
                  className="w-full flex items-center gap-3 px-m py-3 hover:bg-slate-50 dark:hover:bg-dark-elevated transition-colors text-left border-t border-slate-100 dark:border-slate-700"
                >
                  <HelpCircle className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <span className="text-slate-800 dark:text-white font-medium font-outfit">How This Works</span>
                </button>
              )}
              <button
                onClick={() => handleMenuClick(onLogout)}
                className="w-full flex items-center gap-3 px-m py-3 hover:bg-slate-50 dark:hover:bg-dark-elevated transition-colors text-left border-t border-slate-100 dark:border-slate-700"
              >
                <LogOut className="w-5 h-5 text-error" />
                <span className="text-slate-800 dark:text-white font-medium font-outfit">Logout</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
