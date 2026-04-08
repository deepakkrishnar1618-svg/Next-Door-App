import { useEffect, useState } from "react";
import { History, Package, ArrowLeftRight, X, Trophy } from "lucide-react";
import EmptyState from "@/src/components/EmptyState";
import { getUserAvatar } from "@/src/utils/avatars";

interface Transaction {
  id: number;
  listing_title: string;
  listing_type: 'offering' | 'requesting';
  transaction_type: 'sale' | 'rent';
  is_free: number | boolean;
  price: number | null;
  image_url: string | null;
  creator_user_id: string;
  creator_name: string;
  creator_room: string | null;
  winner_user_id: string;
  winner_name: string;
  winner_room: string | null;
  rental_start_datetime: string | null;
  rental_end_datetime: string | null;
  closed_at: string;
}

interface TransactionsPanelProps {
  onClose: () => void;
  currentUserId?: string;
}

export default function TransactionsPanel({ onClose, currentUserId }: TransactionsPanelProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [activeTab]);

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const endpoint = activeTab === 'all' 
        ? '/api/market/transactions' 
        : '/api/market/transactions/my';
      const response = await fetch(endpoint, { credentials: 'include' });
      if (!response.ok) throw new Error("Failed to fetch transactions");
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoading(false);
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
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatRentalPeriod = (start: string | null, end: string | null) => {
    if (!start || !end) return null;
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const getTransactionLabel = (tx: Transaction) => {
    if (tx.transaction_type === 'rent') {
      return tx.listing_type === 'offering' ? 'Rented Out' : 'Rented';
    }
    return tx.listing_type === 'offering' ? 'Sold' : 'Bought';
  };

  const getPartyRole = (tx: Transaction, isCreator: boolean) => {
    if (tx.transaction_type === 'rent') {
      if (tx.listing_type === 'offering') {
        return isCreator ? 'Owner' : 'Renter';
      } else {
        return isCreator ? 'Renter' : 'Owner';
      }
    }
    if (tx.listing_type === 'offering') {
      return isCreator ? 'Seller' : 'Buyer';
    } else {
      return isCreator ? 'Buyer' : 'Seller';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in" onClick={onClose}>
      <div 
        className="w-full max-w-lg bg-white dark:bg-dark-ocean rounded-3xl shadow-xl dark:shadow-soft-dark border border-slate-200 dark:border-slate-700 max-h-[85vh] flex flex-col overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-primary p-4 rounded-t-3xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white font-nura">Transaction History</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-button transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-dark-surface">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors font-outfit ${
              activeTab === 'all'
                ? 'text-primary-pine dark:text-primary-mint border-b-2 border-primary-mint bg-white dark:bg-dark-elevated'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            All Transactions
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 py-3 px-4 text-sm font-semibold transition-colors font-outfit ${
              activeTab === 'my'
                ? 'text-primary-pine dark:text-primary-mint border-b-2 border-primary-mint bg-white dark:bg-dark-elevated'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            My Transactions
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-slate-100 dark:bg-dark-surface rounded-2xl p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12">
              <EmptyState
                type="chat"
                title="No transactions yet"
                description={activeTab === 'all' 
                  ? "Completed deals will appear here" 
                  : "Your completed deals will appear here"
                }
              />
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {transactions.map((tx) => {
                const isUserCreator = currentUserId === tx.creator_user_id;
                const isUserWinner = currentUserId === tx.winner_user_id;
                const rentalPeriod = formatRentalPeriod(tx.rental_start_datetime, tx.rental_end_datetime);

                return (
                  <div
                    key={tx.id}
                    className="bg-slate-50 dark:bg-dark-surface rounded-2xl p-4 border border-slate-200 dark:border-slate-700 hover:border-primary-mint/50 transition-colors"
                  >
                    <div className="flex gap-3">
                      {/* Image */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0">
                        {tx.image_url ? (
                          <img 
                            src={tx.image_url} 
                            alt={tx.listing_title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        {/* Title & Badge */}
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h3 className="font-semibold text-slate-800 dark:text-white font-outfit text-sm truncate">
                            {tx.listing_title}
                          </h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                            tx.transaction_type === 'rent'
                              ? 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400'
                              : 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                          }`}>
                            {getTransactionLabel(tx)}
                          </span>
                        </div>

                        {/* Price */}
                        <div className="flex items-center gap-2 mb-2">
                          {tx.is_free === 1 || tx.is_free === true ? (
                            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">Free</span>
                          ) : tx.price ? (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">${tx.price}</span>
                          ) : null}
                          {rentalPeriod && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-outfit">
                              {rentalPeriod}
                            </span>
                          )}
                        </div>

                        {/* Parties */}
                        <div className="flex items-center gap-3">
                          {/* Creator */}
                          <div className="flex items-center gap-1.5">
                            <img
                              src={getUserAvatar(tx.creator_user_id, null)}
                              alt={tx.creator_name}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-outfit">
                              <span className={isUserCreator ? 'font-semibold text-primary-pine dark:text-primary-mint' : ''}>
                                {isUserCreator ? 'You' : tx.creator_name}
                              </span>
                              <span className="text-slate-400 dark:text-slate-500 ml-1">
                                ({getPartyRole(tx, true)})
                              </span>
                            </span>
                          </div>

                          <ArrowLeftRight className="w-3 h-3 text-slate-400" />

                          {/* Winner */}
                          <div className="flex items-center gap-1.5">
                            <div className="relative">
                              <img
                                src={getUserAvatar(tx.winner_user_id, null)}
                                alt={tx.winner_name}
                                className="w-5 h-5 rounded-full object-cover"
                              />
                              <Trophy className="w-2.5 h-2.5 text-amber-500 absolute -top-0.5 -right-0.5" />
                            </div>
                            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-outfit">
                              <span className={isUserWinner ? 'font-semibold text-primary-pine dark:text-primary-mint' : ''}>
                                {isUserWinner ? 'You' : tx.winner_name}
                              </span>
                              <span className="text-slate-400 dark:text-slate-500 ml-1">
                                ({getPartyRole(tx, false)})
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-outfit">
                        Closed {formatDate(tx.closed_at)}
                      </span>
                      {tx.creator_room && tx.winner_room && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-outfit">
                          Room {tx.creator_room} ↔ Room {tx.winner_room}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
