'use client';

import { useEffect, useState, useRef } from "react";
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
  ArrowUpRight,
  Users,
  Settings,
  HelpCircle,
  Menu,
  X,
  User,
  Check,
  MapPin
} from "lucide-react";

const EXPLORE_MORE_URL = "https://www.deeproduct.org/";

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
    question: "How does the app protect my privacy?",
    answer: "Next Door is fully private. We do not track your location, read your messages, or sell your personal details. All chats, listings, and event data are stored on your own self-hosted Supabase database."
  },
  {
    question: "Can external people join my neighborhood group?",
    answer: "No. Access is controlled by the community administrator. Only users approved by the admin can sign in and participate, ensuring your neighborhood chat remains private."
  },
  {
    question: "Where is my uploaded data and files stored?",
    answer: "All uploaded photos, document attachments, and user avatars are stored securely in your private Supabase Storage buckets under strict access control rules."
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
  const [signInMenuOpen, setSignInMenuOpen] = useState(false);
  const signInMenuRef = useRef<HTMLDivElement>(null);

  // Close the Sign In dropdown on outside click
  useEffect(() => {
    if (!signInMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (signInMenuRef.current && !signInMenuRef.current.contains(e.target as Node)) {
        setSignInMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [signInMenuOpen]);

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
            <div className="relative" ref={signInMenuRef}>
              <button
                onClick={() => setSignInMenuOpen((o) => !o)}
                aria-haspopup="true"
                aria-expanded={signInMenuOpen}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-2 pl-5 pr-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg text-sm h-10 flex items-center justify-center gap-2"
              >
                <span>Sign In</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${signInMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {signInMenuOpen && (
                <div className="absolute right-0 mt-2 w-60 bg-[#0F1C1C] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-in">
                  <button
                    onClick={() => { setSignInMenuOpen(false); redirectToLogin(); }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-white hover:bg-[#1A2828] transition-colors"
                  >
                    <GoogleIconWhite />
                    <span>Sign in with Google</span>
                  </button>
                  <button
                    onClick={() => { setSignInMenuOpen(false); redirectToGuestLogin(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-primary-mint hover:bg-[#1A2828] transition-colors"
                  >
                    <User className="w-5 h-5 shrink-0" />
                    <span>Guest Access</span>
                  </button>
                  <div className="my-1.5 h-px bg-white/5" />
                  <a
                    href={EXPLORE_MORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setSignInMenuOpen(false)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 hover:bg-[#1A2828] hover:text-white transition-colors"
                  >
                    <ArrowUpRight className="w-5 h-5 shrink-0" />
                    <span>Explore more products</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-slate-300 hover:text-white p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Nav Drawer (Solid Background) */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-[#021112] border-b border-white/5 px-6 py-8 flex flex-col gap-6 shadow-2xl animate-in">
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
            <a
              href={EXPLORE_MORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg text-slate-300 hover:text-primary-mint transition-colors flex items-center gap-2"
            >
              <span>Explore more products</span>
              <ArrowUpRight className="w-4 h-4 shrink-0" />
            </a>
            <hr className="border-white/5 my-2" />
            <div className="flex flex-col gap-4">
              <button 
                onClick={redirectToGuestLogin}
                className="w-full bg-[#1A2828]/50 hover:bg-[#243333]/70 text-primary-mint border border-emerald-500/20 font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <User className="w-5 h-5" />
                <span>Guest Access</span>
              </button>
              <button 
                onClick={redirectToLogin}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
              >
                <GoogleIconWhite />
                <span>Google Sign In</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 3. Hero Section (Two-Column, Responsive) */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left column — copy & CTAs */}
          <div className="flex flex-col items-start text-left">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-primary-mint font-medium text-xs py-1.5 px-3.5 rounded-full mb-8">
              <span className="w-1.5 h-1.5 bg-primary-mint rounded-full animate-ping" />
              <span>Stay always connected</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[3.4rem] xl:text-6xl font-extrabold tracking-tight leading-[1.1] font-nura text-white mb-6">
              Welcome to your Friendly <span className="bg-gradient-to-r from-primary-mint via-emerald-400 to-teal-400 bg-clip-text text-transparent">Neighbourhood</span>
            </h1>

            <p className="text-slate-300 text-lg sm:text-xl mb-10 max-w-xl font-light leading-relaxed">
              Connect with your apartment building, street, or local group. Chat in real time, organize events, and buy, sell, or rent items, all in one secure, private place.
            </p>

            {/* Call-to-actions */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <button
                onClick={redirectToGuestLogin}
                className="w-full sm:w-auto bg-[#1A2828]/50 hover:bg-[#243333]/70 text-primary-mint border border-emerald-500/30 font-semibold py-3.5 px-6 sm:px-8 rounded-xl transition-all duration-200 text-center inline-flex items-center justify-center gap-2 hover:scale-[1.01] text-sm sm:text-base h-12 whitespace-nowrap"
              >
                <User className="w-5 h-5 text-primary-mint shrink-0" />
                <span>Guest Access</span>
              </button>
              <button
                onClick={redirectToLogin}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3.5 px-6 sm:px-8 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg text-sm sm:text-base inline-flex items-center justify-center gap-2 hover:scale-[1.01] h-12 whitespace-nowrap"
              >
                <GoogleIconWhite />
                <span>Google Sign In</span>
              </button>
            </div>
          </div>

          {/* Right column — animated app-window preview */}
          <div className="relative w-full max-w-md mx-auto lg:max-w-none lg:mx-0">
            {/* ambient glow */}
            <div className="absolute -inset-6 bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-transparent rounded-[2.5rem] blur-3xl pointer-events-none" />

            <div className="relative animate-float rounded-2xl border border-white/10 bg-[#0F1C1C]/90 backdrop-blur-xl shadow-2xl overflow-hidden">
              {/* Window title bar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-[#1A2828]/60">
                <span className="w-3 h-3 rounded-full bg-[#FF5A5F]/80" />
                <span className="w-3 h-3 rounded-full bg-[#F4D35E]/80" />
                <span className="w-3 h-3 rounded-full bg-[#38EB91]/80" />
                <div className="flex items-center gap-2 ml-3 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[10px] font-bold text-slate-900 shrink-0">N</div>
                  <div className="leading-tight min-w-0">
                    <p className="text-xs font-semibold text-white truncate">Maple Street</p>
                    <p className="text-[10px] text-emerald-400 truncate">Neighbourhood hub</p>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1.5 text-[10px] text-slate-400 shrink-0">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-mint opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-mint" />
                  </span>
                  <span>3 online</span>
                </div>
              </div>

              {/* Tab bar — Events highlighted (unique to a neighbourhood app) */}
              <div className="flex items-center gap-1.5 px-3 pt-3">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 px-2.5 py-1.5 rounded-lg">
                  <MessageSquare className="w-3.5 h-3.5" /> Chat
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-primary-mint bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                  <Calendar className="w-3.5 h-3.5" /> Events
                </span>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 px-2.5 py-1.5 rounded-lg">
                  <ShoppingBag className="w-3.5 h-3.5" /> Market
                </span>
              </div>

              {/* Body — animated Event + Marketplace cards */}
              <div className="p-4 sm:p-5 flex flex-col gap-3 min-h-[300px]">

                {/* Event card */}
                <div className="animate-fade-up rounded-xl border border-white/10 bg-[#1A2828]/70 overflow-hidden" style={{ animationDelay: '300ms' }}>
                  <div className="h-16 bg-gradient-to-br from-emerald-500/30 via-teal-500/20 to-cyan-500/10 relative flex items-end px-3 py-2">
                    <span className="absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider bg-primary-mint text-slate-900 px-2 py-0.5 rounded-full">Event</span>
                    <div className="flex items-center gap-1.5 text-[10px] text-white/90 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-primary-mint shrink-0" />
                      Sat, 14 Jun · 4:00 PM
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-bold text-white">Summer Street Block Party 🎉</p>
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center -space-x-2">
                        {['from-emerald-400 to-teal-500', 'from-amber-300 to-orange-400', 'from-teal-400 to-cyan-500'].map((g, i) => (
                          <span key={i} className={`w-6 h-6 rounded-full bg-gradient-to-br ${g} border-2 border-[#1A2828]`} />
                        ))}
                        <span className="w-6 h-6 rounded-full bg-[#0F1C1C] border-2 border-[#1A2828] flex items-center justify-center text-[8px] font-bold text-slate-300">+12</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-900 bg-primary-mint px-3 py-1 rounded-full flex items-center gap-1">
                        Going <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Marketplace card */}
                <div className="animate-fade-up rounded-xl border border-white/10 bg-[#1A2828]/70 p-3 flex items-center gap-3" style={{ animationDelay: '1100ms' }}>
                  <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-orange-400/30 to-amber-500/20 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-6 h-6 text-accent-coral" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white truncate">Cannondale Bike</p>
                      <span className="text-[9px] font-bold uppercase bg-emerald-500/15 text-primary-mint px-1.5 py-0.5 rounded shrink-0">For Sale</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" /> Great condition · 2 streets away
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-sm font-extrabold text-primary-mint">£120</span>
                      <span className="text-[10px] text-slate-400">3 interested</span>
                    </div>
                  </div>
                </div>

                {/* Live chat snippet tying it together */}
                <div className="animate-fade-up flex items-end gap-2.5" style={{ animationDelay: '1900ms' }}>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-[10px] font-bold text-slate-900 shrink-0">A</div>
                  <div className="bg-[#1A2828]/80 border border-white/5 rounded-2xl rounded-bl-sm px-3.5 py-2 text-xs text-slate-200 max-w-[80%]">
                    Selling my bike too — added it to the marketplace! 🚲
                  </div>
                </div>
              </div>

              {/* Composer (decorative) */}
              <div className="px-4 py-3 border-t border-white/5 bg-[#1A2828]/40 flex items-center gap-2">
                <div className="flex-1 h-9 rounded-full bg-[#0F1C1C]/80 border border-white/5 px-4 flex items-center text-xs text-slate-500 truncate">
                  Post an event or listing…
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                  <ArrowRight className="w-4 h-4 text-white" />
                </div>
              </div>
            </div>
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
                  onClick={redirectToGuestLogin}
                  className="bg-[#1A2828]/50 hover:bg-[#243333]/70 text-primary-mint border border-emerald-500/30 font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 w-full sm:w-auto h-12 text-sm sm:text-base whitespace-nowrap shrink-0"
                >
                  <User className="w-5 h-5 shrink-0" />
                  <span>Guest Access</span>
                </button>
                <button
                  onClick={redirectToLogin}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 w-full sm:w-auto h-12 text-sm sm:text-base whitespace-nowrap shrink-0"
                >
                  <GoogleIconWhite />
                  <span>Google Sign In</span>
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
              Ready to explore? Try signing in to view the demo.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
              <button
                onClick={redirectToGuestLogin}
                className="bg-[#1A2828]/50 hover:bg-[#243333]/70 text-primary-mint border border-emerald-500/20 font-semibold py-2.5 px-6 rounded-xl transition-all duration-200 text-sm inline-flex items-center gap-2 h-10"
              >
                <User className="w-4 h-4" />
                <span>Guest Access</span>
              </button>
              <button
                onClick={redirectToLogin}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-200 text-sm shadow-md hover:shadow-lg inline-flex items-center gap-2 h-10"
              >
                <GoogleIconWhite />
                <span>Google Sign In</span>
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* 6b. Explore More Products Card */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="bg-[#0F1C1C]/60 border border-white/10 rounded-[28px] p-8 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase font-bold text-slate-400 tracking-widest mb-3">More from us</p>
            <h3 className="text-2xl sm:text-3xl font-bold font-nura text-white mb-3">Explore more products</h3>
            <p className="text-slate-400 font-light leading-relaxed max-w-2xl">
              Next Door is part of a wider family of focused tools built to make your digital life calmer and more organized. Take a look at what else we&apos;re building.
            </p>
          </div>
          <a
            href={EXPLORE_MORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full md:w-auto shrink-0 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold py-3.5 px-7 rounded-full transition-all duration-200 shadow-lg shadow-orange-500/25 hover:scale-[1.02] whitespace-nowrap"
          >
            <span>Explore more products</span>
            <ArrowUpRight className="w-4 h-4 shrink-0" />
          </a>
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
