import { MessageCircle, Search, Bell, Users, Loader2 } from "lucide-react";
import { ReactNode } from "react";

interface EmptyStateProps {
  type: 'chat' | 'search' | 'notifications' | 'users' | 'loading';
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export default function EmptyState({ type, title, description, icon, action }: EmptyStateProps) {
  const getDefaultIcon = () => {
    switch (type) {
      case 'chat':
        return <MessageCircle className="w-20 h-20 text-primary-mint/40" strokeWidth={1.5} />;
      case 'search':
        return <Search className="w-20 h-20 text-primary-mint/40" strokeWidth={1.5} />;
      case 'notifications':
        return <Bell className="w-20 h-20 text-primary-mint/40" strokeWidth={1.5} />;
      case 'users':
        return <Users className="w-20 h-20 text-primary-mint/40" strokeWidth={1.5} />;
      case 'loading':
        return <Loader2 className="w-20 h-20 text-primary-mint animate-spin" strokeWidth={1.5} />;
      default:
        return <MessageCircle className="w-20 h-20 text-primary-mint/40" strokeWidth={1.5} />;
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-xl">
      <div className="text-center max-w-md animate-in">
        {/* Illustration container with gradient background */}
        <div className="relative mb-l">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-mint/10 to-primary-pine/10 dark:from-primary-mint/5 dark:to-primary-pine/5 blur-3xl rounded-full" />
          <div className="relative flex items-center justify-center">
            {icon || getDefaultIcon()}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-s font-nura">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-l font-outfit max-w-sm mx-auto">
            {description}
          </p>
        )}

        {/* Action button */}
        {action && (
          <div className="flex justify-center">
            {action}
          </div>
        )}

        {/* Decorative elements */}
        <div className="flex justify-center gap-2 mt-l opacity-30">
          <div className="w-2 h-2 rounded-full bg-primary-mint animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-primary-pine animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-primary-mint animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
