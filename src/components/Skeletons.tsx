/**
 * Skeleton loading components for various UI elements
 * Uses shimmer animation for a polished loading experience
 */

interface SkeletonProps {
  className?: string;
}

// Base skeleton element with shimmer animation
function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 bg-[length:200%_100%] rounded ${className}`}
      style={{ animation: 'shimmer 1.5s ease-in-out infinite' }}
    />
  );
}

// Message bubble skeleton - mimics the chat message layout
export function MessageSkeleton({ isOwnMessage = false }: { isOwnMessage?: boolean }) {
  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} gap-2 mb-4`}>
      {!isOwnMessage && (
        <Skeleton className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full flex-shrink-0" />
      )}
      <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[85%] sm:max-w-[75%]`}>
        {!isOwnMessage && (
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-8" />
          </div>
        )}
        <div className={`rounded-2xl px-4 py-3 ${isOwnMessage ? 'bg-primary-mint/10 dark:bg-primary-pine/30' : 'bg-light-surface dark:bg-dark-surface'}`}>
          <Skeleton className="h-4 w-48 sm:w-64 mb-2" />
          <Skeleton className="h-4 w-32 sm:w-40" />
        </div>
        <Skeleton className="h-2.5 w-12 mt-1" />
      </div>
      {isOwnMessage && (
        <Skeleton className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-full flex-shrink-0" />
      )}
    </div>
  );
}

// Multiple message skeletons for loading state
export function MessageListSkeleton({ count = 6 }: { count?: number }) {
  const pattern = [false, false, true, false, true, false, true, false];
  return (
    <div className="px-4 py-6 space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <MessageSkeleton key={i} isOwnMessage={pattern[i % pattern.length]} />
      ))}
    </div>
  );
}

// Event card skeleton
export function EventCardSkeleton() {
  return (
    <div className="bg-slate-50 dark:bg-dark-surface border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3">
      <Skeleton className="h-6 w-3/4" />
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  );
}

// Multiple event card skeletons
export function EventListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </>
  );
}

// User row skeleton for read receipts, delivered to, member lists
export function UserRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-12" />
        </div>
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

// Multiple user row skeletons
export function UserListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      {Array.from({ length: count }).map((_, i) => (
        <UserRowSkeleton key={i} />
      ))}
    </div>
  );
}

// Search result skeleton
export function SearchResultSkeleton() {
  return (
    <div className="px-6 py-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-3/4 mb-1.5" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

// Multiple search result skeletons
export function SearchResultsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-700">
      {Array.from({ length: count }).map((_, i) => (
        <SearchResultSkeleton key={i} />
      ))}
    </div>
  );
}

// Notification skeleton
export function NotificationSkeleton() {
  return (
    <div className="px-4 py-4">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="w-2 h-2 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-4 w-2/3 mb-1.5" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

// Multiple notification skeletons
export function NotificationsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-700">
      {Array.from({ length: count }).map((_, i) => (
        <NotificationSkeleton key={i} />
      ))}
    </div>
  );
}

export default Skeleton;
