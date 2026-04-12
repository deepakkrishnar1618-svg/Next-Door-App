'use client';

import { useEffect } from "react";
import { useAuth } from "@/src/lib/auth-hook";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/src/context/ThemeContext";

export default function HomePage() {
  const { user, isPending, redirectToLogin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme } = useTheme();

  // Supabase sometimes redirects to /?code=... instead of /auth/callback?code=...
  // when the callback URL isn't in the Supabase allowlist. Forward it manually.
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      router.replace(`/auth/callback?code=${encodeURIComponent(code)}`);
    }
  }, [searchParams, router]);

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@800&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    return () => { document.head.removeChild(link); };
  }, []);

  useEffect(() => {
    if (!isPending && user) {
      fetch("/api/profile", { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (!data) return;
          if (data.profile_completed) router.push("/chat");
          else router.push("/profile/setup");
        })
        .catch(() => {});
    }
  }, [user, isPending, router]);

  if (isPending) {
    return (
      <div className="min-h-screen bg-[#021112] dark:bg-dark-ocean flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#021112] dark:bg-dark-ocean relative overflow-hidden flex items-center justify-center md:justify-end p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://019b6b00-196b-77b5-ae46-bd09bff90213.mochausercontent.com/image.png_0340.png)',
          opacity: theme === 'dark' ? 0.75 : 0.6
        }}
      />
      <div className="absolute inset-0 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="opacity-60">
          <defs>
            <pattern id="grid" width="138.5" height="159.163" patternUnits="userSpaceOnUse">
              <path d="M92.9788 -97.1181H-45.0152V62.0443H78.6826L92.9788 45.555V-97.1181ZM107.656 62.0443L93.5445 45.7677V-97.1181H231.538V62.0443H107.656ZM93.5445 78.7309L107.446 62.6967H231.538V221.859H93.5445V78.7309ZM78.8928 62.6967L92.9788 78.9435V221.859H-45.0152V62.6967H78.8928Z"
                stroke="url(#paint0_radial)" strokeWidth="0.5" fill="none" strokeOpacity="0.6" />
            </pattern>
            <radialGradient id="paint0_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(647.5 382) rotate(90) scale(479)">
              <stop stopColor="#10B981" stopOpacity="0.4" />
              <stop offset="1" stopColor="#0D9488" stopOpacity="0.1" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      <div className="relative z-10 w-full max-w-[414px] bg-white dark:bg-dark-surface rounded-3xl shadow-2xl px-6 py-14 md:px-8 md:py-[72px] md:mr-[10%] lg:mr-[15%] flex flex-col items-center border border-white/20 dark:border-slate-700">
        <img
          src="https://019b6b00-196b-77b5-ae46-bd09bff90213.mochausercontent.com/image.png_3083.png"
          alt="Next Door"
          className="w-[70px] h-[70px] sm:w-[80px] sm:h-[80px] md:w-[90px] md:h-[90px] rounded-xl mb-6 shadow-lg"
        />
        <h1 className="text-2xl sm:text-3xl md:text-[32px] font-extrabold text-[#0D9488] dark:text-primary-mint mb-2 tracking-wide text-center"
          style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800 }}>
          NEXT DOOR
        </h1>
        <p className="text-[#9CA3AF] dark:text-slate-400 text-xs sm:text-sm mb-6 font-light text-center">
          Neighbourhood chat
        </p>
        <button
          onClick={redirectToLogin}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 px-16 md:px-20 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg mb-6 text-sm sm:text-base"
        >
          Sign in with Google
        </button>
        <p className="text-[#9CA3AF] dark:text-slate-400 text-xs sm:text-sm text-center font-light px-2">
          Stay connected with your neighbourhood
        </p>
        <div className="mt-4 flex justify-center gap-4 text-xs text-[#9CA3AF] dark:text-slate-500">
          <Link href="/privacy" className="hover:text-emerald-500 dark:hover:text-primary-mint transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-emerald-500 dark:hover:text-primary-mint transition-colors">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
