'use client';

import { useEffect, useState } from "react";
import { useAuth } from "@/src/lib/auth-hook";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/src/context/ThemeContext";
import { 
  MessageSquare, 
  ShoppingBag, 
  Calendar, 
  Shield, 
  Lock, 
  Server, 
  ChevronDown, 
  ChevronUp, 
  ArrowRight, 
  Users,
  Settings,
  HelpCircle,
  Menu,
  X,
  User
} from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "How do I deploy this app for my neighborhood?",
    answer: "Next Door is easy to set up. You can host it by cloning our repository, starting a free database on Supabase, and deploying the web app on Vercel. We have a simple guide to walk you through it."
  },
  {
    question: "What are the database requirements?",
    answer: "The app runs on a Supabase database. We include a schema script that automatically sets up your tables, security rules, and databases in less than a minute."
  },
  {
    question: "How does the Google OAuth sign-in work?",
    answer: "We use secure, passwordless logins through Google. The first person to sign in with the admin email gets full control to approve or block other members."
  },
  {
    question: "Is there any cost to running this app?",
    answer: "Running Next Door is completely free for most neighborhood groups. It fits entirely within the free tiers of Vercel, Supabase, and Google Cloud."
  }
];

interface FeatureInfo {
  id: string;
  icon: any;
  title: string;
  subtitle: string;
  desc: string;
  bullets: string[];
}

const FEATURES: FeatureInfo[] = [
  {
    id: "chat",
    icon: MessageSquare,
    title: "Group Chats & Threads",
    subtitle: "Stay in sync instantly",
    desc: "Communicate with your neighbors in a modern chat room. Express yourself with emoji reactions, reply to threads, upload file or image attachments, and track read receipts dynamically.",
    bullets: ["Real-time online status heartbeat", "Pinned admin announcements", "Full-text message history search"]
  },
  {
    id: "events",
    icon: Calendar,
    title: "Neighborhood Events",
    subtitle: "Organize street events & RSVPs",
    desc: "Create local gatherings, meetings, block parties, or clean-ups. Residents can RSVP with capacity limits, and every event gets a dedicated temporary chat room for coordinated planning.",
    bullets: ["Cap attendee capacities easily", "Dedicated chat room per event", "Automatic past event archiving"]
  },
  {
    id: "marketplace",
    icon: ShoppingBag,
    title: "Local Marketplace",
    subtitle: "Buy, sell, rent, or swap",
    desc: "A secure marketplace dedicated solely to your building or street. List items as Sale, Rent, or Free. Interested parties queue up, enabling the listing creator to pick a buyer and negotiate privately.",
    bullets: ["Rent, Sale, and Free classifications", "Private 1-on-1 offer chats", "Transaction timeline lifecycles"]
  },
  {
    id: "admin",
    icon: Settings,
    title: "Admin Moderation Tools",
    subtitle: "Keep the community safe",
    desc: "Community leads have absolute moderation rights. Manage member activation, suspend accounts, clear chat history when needed, export directory CSVs, and configure automated email digests.",
    bullets: ["User status activation control", "Weekly email digest settings", "CSV member list downloads"]
  },
  {
    id: "profile",
    icon: Users,
    title: "Rich Member Profiles",
    subtitle: "Know who you are talking to",
    desc: "Each member completes a profile indicating their room or house number and display name. View neighborhood activity history, check real-time online status indicators, and view bios.",
    bullets: ["Apartment and house room numbers", "Real-time online indicators", "Short user biography text"]
  }
];

const GoogleIconColored = () => (
  <svg className="mr-3 h-5 w-5 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#EA4335"
      d="M12 5.04c1.67 0 3.2.58 4.39 1.71l3.27-3.27C17.69 1.54 14.99 1 12 1 7.35 1 3.37 3.67 1.39 7.56l3.86 3c1-2.92 3.73-5.52 6.75-5.52z"
    />
    <path
      fill="#4285F4"
      d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.76 2.92c2.2-2.03 3.67-5.01 3.67-8.65z"
    />
    <path
      fill="#FBBC05"
      d="M5.25 14.56c-.24-.72-.38-1.5-.38-2.31s.14-1.59.38-2.31L1.39 6.94C.5 8.71 0 10.7 0 12.8s.5 4.09 1.39 5.86l3.86-3.04z"
    />
    <path
      fill="#34A853"
      d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.76-2.92c-1.1.74-2.5 1.18-4.2 1.18-3.02 0-5.75-2.6-6.75-5.52l-3.86 3C3.37 20.33 7.35 23 12 23z"
    />
  </svg>
);

const GoogleIconWhite = () => (
  <svg className="mr-3 h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.51 0-6.357-2.89-6.357-6.457 0-3.568 2.848-6.458 6.357-6.458 1.614 0 3.08.575 4.22 1.517l3.245-3.245C19.24 1.935 15.93 1 12.24 1 5.922 1 1 5.973 1 12.114c0 6.14 4.922 11.115 11.24 11.115 6.458 0 11.24-4.514 11.24-11.115 0-.749-.075-1.425-.225-2.071H12.24z" />
  </svg>
);

export default function HomePage() {
  const { user, isPending, redirectToLogin, redirectToGuestLogin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Component states
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle Supabase manual code forwarding
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      router.replace(`/auth/callback?code=${encodeURIComponent(code)}`);
    }
  }, [searchParams, router]);

  // Handle redirect if user is logged in
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

  // Track scrolling to change navbar background
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isPending) {
    return (
      <div className="min-h-screen bg-[#021112] flex items-center justify-center">
        <div className="text-white text-xl animate-pulse-slow">Loading...</div>
      </div>
    );
  }

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#021112] text-white font-outfit relative selection:bg-primary-mint selection:text-slate-900">
      
      {/* 1. Demo Disclaimer Banner */}
      <div className="w-full bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 border-b border-emerald-500/20 text-center py-2 px-4 text-xs sm:text-sm text-emerald-300 font-medium relative z-50 flex items-center justify-center gap-2">
        <span className="inline-block bg-primary-mint text-slate-900 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0">Demo Product</span>
        <span>This is a live demonstration of the Next Door community app. Data is reset periodically.</span>
      </div>

      {/* Decorative Grid Background */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-emerald-500/10 to-teal-500/0 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] right-[10%] w-[600px] h-[600px] bg-gradient-to-br from-primary-mint/5 to-teal-500/5 rounded-full blur-[150px]" />
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="opacity-10">
          <defs>
            <pattern id="grid-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>
      </div>

      {/* 2. Navigation Header */}
      <header className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        scrolled ? "bg-[#021112]/95 backdrop-blur-md border-b border-white/5 py-4 shadow-soft-dark" : "bg-transparent py-6"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link href="#" className="flex items-center gap-3 group">
            <img src="/icon.svg" className="w-10 h-10 rounded-xl shadow-lg group-hover:scale-105 transition-transform duration-200" alt="Next Door" />
            <div>
              <span className="text-xl font-bold tracking-tight text-white block font-nura group-hover:text-primary-mint transition-colors">Next Door</span>
              <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold block -mt-1">Neighbourhood Chat</span>
            </div>
          </Link>

          {/* Desktop Nav links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-primary-mint transition-colors duration-200">Features</a>
            <a href="#security" className="hover:text-primary-mint transition-colors duration-200">Privacy & Security</a>
            <a href="#faq" className="hover:text-primary-mint transition-colors duration-200">FAQ</a>
            <a 
              href="https://github.com/deepakkrishnar1618-svg/Next-Door-App" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-primary-mint transition-colors duration-200 flex items-center gap-1"
            >
              GitHub
            </a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={redirectToGuestLogin}
              className="bg-emerald-600/10 hover:bg-emerald-600/20 text-primary-mint border border-emerald-500/30 font-semibold py-2 px-5 rounded-xl transition-all duration-200 text-sm"
            >
              Guest Login
            </button>
            <button 
              onClick={redirectToLogin}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-2 px-5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg text-sm flex items-center gap-2 group"
            >
              <GoogleIconWhite />
              <span>Sign In</span>
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-slate-300 hover:text-white p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-[#021112]/98 backdrop-blur-lg border-b border-white/5 px-6 py-8 flex flex-col gap-6 shadow-2xl animate-in">
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg text-slate-300 hover:text-primary-mint transition-colors"
            >
              Features
            </a>
            <a 
              href="#security" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg text-slate-300 hover:text-primary-mint transition-colors"
            >
              Privacy & Security
            </a>
            <a 
              href="#faq" 
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg text-slate-300 hover:text-primary-mint transition-colors"
            >
              FAQ
            </a>
            <a 
              href="https://github.com/deepakkrishnar1618-svg/Next-Door-App" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-lg text-slate-300 hover:text-primary-mint transition-colors"
            >
              GitHub Repository
            </a>
            <hr className="border-white/5 my-2" />
            <div className="flex flex-col gap-4">
              <button 
                onClick={redirectToGuestLogin}
                className="w-full bg-[#1A2828] hover:bg-slate-800 text-primary-mint border border-emerald-500/20 font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <User className="w-5 h-5" />
                <span>Try as Guest</span>
              </button>
              <button 
                onClick={redirectToLogin}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <GoogleIconWhite />
                <span>Sign in with Google</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 3. Hero Section (Centered & Simplified) */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 flex flex-col items-center text-center">
        
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-primary-mint font-medium text-xs py-1.5 px-3.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 bg-primary-mint rounded-full animate-ping" />
          <span>Welcome to your Friendly Neighbourhood</span>
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-tight font-nura text-white mb-8 max-w-3xl">
          A private app for your <span className="bg-gradient-to-r from-primary-mint via-emerald-400 to-teal-400 bg-clip-text text-transparent">neighbourhood.</span>
        </h1>

        <p className="text-slate-300 text-lg sm:text-xl mb-12 max-w-2xl font-light leading-relaxed">
          Connect with your apartment building, street, or local group. Chat in real time, organize events, and buy, sell, or rent items, all in one secure, private place.
        </p>

        {/* Call-to-actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto mb-16">
          <button
            onClick={redirectToLogin}
            className="w-full sm:w-auto bg-white hover:bg-slate-100 text-slate-950 font-bold py-4.5 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group hover:scale-[1.02] text-base"
          >
            <GoogleIconColored />
            <span>Sign in with Google</span>
          </button>
          <button 
            onClick={redirectToGuestLogin}
            className="w-full sm:w-auto bg-[#1A2828] hover:bg-[#243333] text-primary-mint border border-emerald-500/30 font-semibold py-4.5 px-8 rounded-xl transition-all duration-200 text-center flex items-center justify-center gap-2 hover:scale-[1.02] text-base"
          >
            <User className="w-5 h-5 text-primary-mint" />
            <span>Try as Guest</span>
          </button>
        </div>

        {/* Quick Metrics */}
        <div className="grid grid-cols-3 gap-8 sm:gap-16 border-t border-white/10 pt-10 w-full max-w-xl justify-center">
          <div>
            <p className="text-xl sm:text-2xl font-bold font-nura text-primary-mint">Real-time</p>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">WebSockets</p>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold font-nura text-primary-mint">100%</p>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Self-Hosted</p>
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-bold font-nura text-primary-mint">Zero</p>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-semibold">Ad Trackers</p>
          </div>
        </div>

      </section>

      {/* 4. Features Section (Clean Card Grid) */}
      <section id="features" className="relative z-10 py-20 bg-[#0F1C1C]/50 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-xs uppercase font-extrabold text-primary-mint tracking-widest mb-3">Product capabilities</h2>
            <p className="text-3xl sm:text-4xl font-extrabold font-nura mb-4">Everything your community needs.</p>
            <p className="text-slate-400 font-light text-base sm:text-lg">
              Next Door brings group chats, local events, and transactions into one secure platform without tracking you.
            </p>
          </div>

          {/* Features Cards Grid Layout */}
          <div className="flex flex-col gap-8">
            {/* Top 3 primary features */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {FEATURES.slice(0, 3).map((feat) => {
                const FeatIcon = feat.icon;
                return (
                  <div 
                    key={feat.id}
                    className="bg-[#1A2828]/40 border border-white/5 p-8 rounded-2xl hover:border-emerald-500/20 hover:bg-[#1A2828]/60 transition-all duration-300 group hover:-translate-y-1"
                  >
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                      <FeatIcon className="w-6 h-6 text-primary-mint" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 font-nura text-white group-hover:text-primary-mint transition-colors">
                      {feat.title}
                    </h3>
                    <p className="text-slate-400 text-sm font-light leading-relaxed mb-6">
                      {feat.desc}
                    </p>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {feat.bullets.map((bullet, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-primary-mint rounded-full shrink-0" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>

            {/* Bottom 2 auxiliary features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto w-full">
              {FEATURES.slice(3, 5).map((feat) => {
                const FeatIcon = feat.icon;
                return (
                  <div 
                    key={feat.id}
                    className="bg-[#1A2828]/40 border border-white/5 p-8 rounded-2xl hover:border-emerald-500/20 hover:bg-[#1A2828]/60 transition-all duration-300 group hover:-translate-y-1"
                  >
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-6 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                      <FeatIcon className="w-6 h-6 text-primary-mint" />
                    </div>
                    <h3 className="text-xl font-bold mb-3 font-nura text-white group-hover:text-primary-mint transition-colors">
                      {feat.title}
                    </h3>
                    <p className="text-slate-400 text-sm font-light leading-relaxed mb-6">
                      {feat.desc}
                    </p>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {feat.bullets.map((bullet, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-primary-mint rounded-full shrink-0" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </section>

      {/* 5. Privacy & Security Section */}
      <section id="security" className="relative z-10 py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-[#1A2828] to-[#0F1C1C] rounded-[32px] p-8 md:p-16 border border-white/10 shadow-2xl relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5 col-span-1">
              <span className="text-xs uppercase font-bold text-primary-mint tracking-widest block mb-3">Privacy First</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold font-nura mb-6 leading-tight">
                Your community data belongs to your community.
              </h2>
              <p className="text-slate-300 font-light leading-relaxed mb-8">
                Unlike public social networks, Next Door is self-hosted and private. You keep full control of your messages, events, and emails. Your data is completely safe from ads and trackers.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={redirectToLogin}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <GoogleIconWhite />
                  <span>Google Sign In</span>
                </button>
                <button 
                  onClick={redirectToGuestLogin}
                  className="bg-[#1A2828] hover:bg-[#243333] text-primary-mint border border-emerald-500/20 font-semibold py-3 px-8 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <User className="w-5 h-5" />
                  <span>Guest Access</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 col-span-1 grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Feature 1 */}
              <div className="bg-[#0F1C1C]/60 p-6 rounded-2xl border border-white/5">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Lock className="w-5 h-5 text-primary-mint" />
                </div>
                <h4 className="text-lg font-bold mb-2 font-nura text-white">Passwordless OAuth</h4>
                <p className="text-slate-400 text-xs font-light leading-relaxed">
                  Sign in instantly with Google. No new passwords to remember, secure session handling, and fully governed by local admin approval before accessing data.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-[#0F1C1C]/60 p-6 rounded-2xl border border-white/5">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Server className="w-5 h-5 text-primary-mint" />
                </div>
                <h4 className="text-lg font-bold mb-2 font-nura text-white">100% Self-Hosted</h4>
                <p className="text-slate-400 text-xs font-light leading-relaxed">
                  Host Next Door on Vercel and your own Supabase instance. Run queries directly, migrate database contents easily, and retain total data sovereignty.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-[#0F1C1C]/60 p-6 rounded-2xl border border-white/5">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-5 h-5 text-primary-mint" />
                </div>
                <h4 className="text-lg font-bold mb-2 font-nura text-white">No Ads or Algorithms</h4>
                <p className="text-slate-400 text-xs font-light leading-relaxed">
                  Zero feeds, recommendation filters, or commercial tracking. We use cookies purely to hold your session, with no analytics, profiling, or tracking.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="bg-[#0F1C1C]/60 p-6 rounded-2xl border border-white/5">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Settings className="w-5 h-5 text-primary-mint" />
                </div>
                <h4 className="text-lg font-bold mb-2 font-nura text-white">Strict Admin Moderation</h4>
                <p className="text-slate-400 text-xs font-light leading-relaxed">
                  The designated administrator can approve new accounts, suspend users, clear channels, and generate legal data exports, keeping safety standards absolute.
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 6. FAQ Section */}
      <section id="faq" className="relative z-10 py-20 bg-[#0F1C1C]/30 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-500/10 rounded-full mb-4">
              <HelpCircle className="w-6 h-6 text-primary-mint" />
            </div>
            <h2 className="text-3xl font-extrabold font-nura text-white mb-3">Frequently Asked Questions</h2>
            <p className="text-slate-400 font-light text-sm">Have questions about setting up Next Door? Check our answers below.</p>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, idx) => (
              <div 
                key={idx}
                className="bg-[#1A2828]/50 border border-white/5 rounded-2xl overflow-hidden transition-colors hover:border-emerald-500/15"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                >
                  <span className="font-semibold text-white text-base font-nura">{item.question}</span>
                  {activeFaq === idx ? (
                    <ChevronUp className="w-5 h-5 text-primary-mint shrink-0 ml-4" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400 shrink-0 ml-4" />
                  )}
                </button>

                <div 
                  className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    activeFaq === idx ? "max-h-60 border-t border-white/5" : "max-h-0"
                  }`}
                >
                  <p className="px-6 py-5 text-sm text-slate-300 font-light leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#1A2828]/30 border border-emerald-500/20 rounded-2xl p-6 text-center mt-12">
            <p className="text-slate-300 text-sm font-light">
              Ready to explore? Try signing in to view the demo dashboard.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
              <button 
                onClick={redirectToLogin}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-200 text-sm shadow-md hover:shadow-lg inline-flex items-center gap-2"
              >
                <GoogleIconWhite />
                <span>Google Sign In</span>
              </button>
              <button 
                onClick={redirectToGuestLogin}
                className="bg-[#1A2828] hover:bg-[#243333] text-primary-mint border border-emerald-500/20 font-semibold py-2.5 px-6 rounded-xl transition-all duration-200 text-sm inline-flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                <span>Guest Access</span>
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 7. Footer Section */}
      <footer className="relative z-10 bg-[#021112] border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/icon.svg" className="w-8 h-8 rounded-lg shadow-md" alt="Next Door" />
            <div>
              <span className="text-sm font-bold tracking-tight text-white font-nura">Next Door</span>
              <span className="text-[9px] text-slate-400 block -mt-1">Neighbourhood Chat</span>
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-xs text-slate-400">
            <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-primary-mint transition-colors">Privacy Policy</Link>
            <Link href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-primary-mint transition-colors">Terms of Service</Link>
            <a href="https://github.com/deepakkrishnar1618-svg/Next-Door-App" target="_blank" rel="noopener noreferrer" className="hover:text-primary-mint transition-colors">GitHub Repo</a>
          </div>

          <p className="text-xs text-slate-500 text-center md:text-right">
            &copy; {new Date().getFullYear()} Next Door. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
