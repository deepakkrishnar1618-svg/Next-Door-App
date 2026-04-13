'use client';

import { useEffect } from "react";
import { useAuth } from "@/src/lib/auth-hook";
import { useRouter } from "next/navigation";
import Onboarding from "@/src/components/Onboarding";

export default function OnboardingPage() {
  const { user, isPending } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !user) { router.push("/"); return; }
    // Key the onboarding flag to the user ID so deleted+re-registered users
    // always see onboarding fresh (their old localStorage entry has a different key)
    if (typeof window !== 'undefined' && user) {
      const key = `onboarding_completed_${user.id}`;
      if (localStorage.getItem(key) === "true") router.push("/chat");
    }
  }, [user, isPending, router]);

  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-light-bg via-slate-100 to-slate-50 dark:from-dark-ocean dark:via-dark-surface dark:to-dark-elevated flex items-center justify-center">
        <div className="text-slate-600 dark:text-white text-xl font-outfit">Loading...</div>
      </div>
    );
  }
  if (!user) return null;
  return <Onboarding />;
}
