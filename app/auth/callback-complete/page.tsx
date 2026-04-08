'use client';

import { useEffect } from "react";
import { useAuth } from "@/src/lib/auth-hook";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const { user, isPending, exchangeCodeForSessionToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        await exchangeCodeForSessionToken();

        // Wait for auth state to propagate
        if (!isPending) {
          const profileResponse = await fetch("/api/profile", { credentials: 'include' });
          const profileData = await profileResponse.json();
          if (profileData.profile_completed) router.push("/chat");
          else router.push("/profile/setup");
        }
      } catch (error) {
        console.error("Auth error:", error);
        router.push("/");
      }
    };

    handleCallback();
  }, [isPending]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 flex items-center justify-center">
      <div className="text-white text-xl">Signing you in...</div>
    </div>
  );
}
