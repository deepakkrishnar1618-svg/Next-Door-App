// Preset animal warrior avatars (local SVGs)
export const PRESET_AVATARS = [
  { id: 'dog-viking',     label: 'Dog Viking',     path: '/avatars/dog-viking.svg' },
  { id: 'cat-greek',      label: 'Cat Greek',      path: '/avatars/cat-greek.svg' },
  { id: 'rabbit-samurai', label: 'Rabbit Samurai', path: '/avatars/rabbit-samurai.svg' },
  { id: 'fox-ninja',      label: 'Fox Ninja',      path: '/avatars/fox-ninja.svg' },
  { id: 'bear-knight',    label: 'Bear Knight',    path: '/avatars/bear-knight.svg' },
  { id: 'panda-monk',     label: 'Panda Monk',     path: '/avatars/panda-monk.svg' },
  { id: 'lion-pharaoh',   label: 'Lion Pharaoh',   path: '/avatars/lion-pharaoh.svg' },
  { id: 'wolf-celt',      label: 'Wolf Celt',      path: '/avatars/wolf-celt.svg' },
];

// Character avatar URLs
const CHARACTER_AVATARS = [
  "https://019b6b00-196b-77b5-ae46-bd09bff90213.mochausercontent.com/character-avatar-1.png",
  "https://019b6b00-196b-77b5-ae46-bd09bff90213.mochausercontent.com/character-avatar-2.png",
  "https://019b6b00-196b-77b5-ae46-bd09bff90213.mochausercontent.com/character-avatar-3.png",
  "https://019b6b00-196b-77b5-ae46-bd09bff90213.mochausercontent.com/character-avatar-4.png",
  "https://019b6b00-196b-77b5-ae46-bd09bff90213.mochausercontent.com/character-avatar-5.png",
];

/**
 * Get a unique character avatar for a user based on their ID
 * This ensures the same user always gets the same character avatar
 */
export function getCharacterAvatar(userId: string): string {
  if (!userId) return CHARACTER_AVATARS[0];
  // Create a simple hash from the user ID
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Get absolute value and map to avatar index
  const index = Math.abs(hash) % CHARACTER_AVATARS.length;
  return CHARACTER_AVATARS[index];
}

/**
 * Get the avatar URL to display for a user
 * Returns custom avatar if available, otherwise returns character avatar
 */
export function getUserAvatar(userId: string, customAvatarUrl: string | null): string {
  return customAvatarUrl || getCharacterAvatar(userId);
}

/**
 * Check if user has been deactivated (blocked) - is_active = 0 and is_deleted = 0/null
 */
export function isDeactivatedUser(isActive: number | boolean | null | undefined, isDeleted: number | boolean | null | undefined): boolean {
  const active = isActive === 1 || isActive === true;
  const deleted = isDeleted === 1 || isDeleted === true;
  return !active && !deleted;
}

/**
 * Check if user has been deleted (permanently) - is_deleted = 1
 * Also supports legacy check where room_number === 'Deleted' for backward compatibility
 */
export function isDeletedUser(isDeletedOrRoomNumber: number | boolean | string | null | undefined): boolean {
  if (typeof isDeletedOrRoomNumber === 'string') {
    return isDeletedOrRoomNumber === 'Deleted';
  }
  return isDeletedOrRoomNumber === 1 || isDeletedOrRoomNumber === true;
}

/**
 * Check if user is inactive (either deactivated or deleted)
 */
export function isInactiveUser(isActive: number | boolean | null | undefined, isDeleted: number | boolean | null | undefined): boolean {
  return isDeactivatedUser(isActive, isDeleted) || isDeletedUser(isDeleted);
}
