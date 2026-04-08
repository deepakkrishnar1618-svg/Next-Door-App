import { useState } from "react";
import { Search, X, Calendar } from "lucide-react";
import { getUserAvatar } from "@/src/utils/avatars";

interface SearchResult {
  id: number;
  content: string;
  user_name: string;
  user_id: string;
  user_avatar_url: string | null;
  created_at: string;
  hashtag_name: string | null;
  hashtag_emoji: string | null;
}

interface SearchPanelProps {
  onClose: () => void;
  onMessageClick: (messageId: number) => void;
}

export default function SearchPanel({ onClose, onMessageClick }: SearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const response = await fetch(
        `/api/messages/search?q=${encodeURIComponent(searchQuery)}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const highlightSearchTerm = (text: string, query: string) => {
    if (!query) return text;
    
    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={index} className="bg-primary-mint/30 dark:bg-primary-mint/20 text-slate-900 dark:text-white rounded px-0.5">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          )
        )}
      </>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-dark-ocean">
      {/* Header */}
      <div className="flex items-center justify-between px-xl py-m border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-dark-ocean">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white font-nura">Search Messages</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-button-rect hover:bg-slate-100 dark:hover:bg-dark-elevated transition-all hover:scale-105"
          title="Close"
        >
          <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      {/* Search Input */}
      <div className="px-xl py-m border-b border-slate-200 dark:border-slate-700">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search messages..."
            className="w-full px-m py-3 pr-12 border-2 border-transparent rounded-button-rect focus:border-primary-mint bg-light-surface dark:bg-dark-surface text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 font-outfit outline-none transition-all"
            autoFocus
          />
          <button
            onClick={handleSearch}
            disabled={!searchQuery.trim() || isSearching}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary-mint hover:text-primary-pine disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-s font-outfit">
          Press Enter or click the search icon to search
        </p>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {isSearching ? (
          <div className="flex flex-col items-center justify-center py-16 px-m">
            <div className="w-20 h-20 mb-m">
              <Search className="w-full h-full text-primary-mint opacity-50 animate-pulse" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2 font-nura">Searching...</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center font-outfit">
              Looking through your messages
            </p>
          </div>
        ) : !hasSearched ? (
          <div className="flex flex-col items-center justify-center py-16 px-m">
            <div className="w-20 h-20 mb-m">
              <Search className="w-full h-full text-primary-mint opacity-50" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2 font-nura">Search Messages</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center font-outfit">
              Enter a search term above to find messages by content, hashtags, or sender
            </p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-m">
            <div className="w-20 h-20 mb-m">
              <Search className="w-full h-full text-slate-400 dark:text-slate-600 opacity-50" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2 font-nura">No results found</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center font-outfit">
              Try a different search term or check your spelling
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => {
                  onMessageClick(result.id);
                  onClose();
                }}
                className="w-full px-m py-m text-left hover:bg-slate-50 dark:hover:bg-dark-elevated transition-colors"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={getUserAvatar(result.user_id, result.user_avatar_url)}
                    alt={result.user_name}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-white dark:ring-dark-ocean shadow-soft"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white font-outfit">
                        {result.user_name}
                      </p>
                      {result.hashtag_name && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary-mint/10 dark:bg-primary-mint/20 text-primary-mint rounded-button font-outfit">
                          {result.hashtag_emoji} {result.hashtag_name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 mb-1.5 font-outfit">
                      {highlightSearchTerm(result.content, searchQuery)}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-outfit">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(result.created_at)}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      {hasSearched && !isSearching && results.length > 0 && (
        <div className="px-m py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-elevated">
          <p className="text-sm text-slate-600 dark:text-slate-300 font-outfit">
            Found <span className="font-semibold text-primary-mint">{results.length}</span>{" "}
            {results.length === 1 ? "message" : "messages"}
          </p>
        </div>
      )}
    </div>
  );
}
