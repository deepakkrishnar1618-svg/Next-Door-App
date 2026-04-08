'use client';

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/lib/auth-hook";
import { useEffect } from "react";
import ListingChatView from "@/src/components/ListingChatView";

export default function ListingChatPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isPending } = useAuth();

  useEffect(() => {
    if (!isPending && !user) router.push("/");
  }, [user, isPending, router]);

  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-light-bg to-slate-100 dark:from-dark-ocean dark:to-dark-ocean flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-mint"></div>
      </div>
    );
  }
  if (!user) return null;

  const listingId = parseInt(params?.id || "0", 10);
  if (!listingId) { router.push("/market"); return null; }

  return <ListingChatView listingId={listingId} onBack={() => router.push("/market")} />;
}
