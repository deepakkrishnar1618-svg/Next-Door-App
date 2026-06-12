import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-mint': '#4AFF9F',
        'primary-pine': '#205455',
        'accent-coral': '#FF8C66',
        'success': '#38EB91',
        'warning': '#F4D35E',
        'error': '#FF5A5F',
        'dark-ocean': '#0F1C1C',
        'dark-surface': '#1A2828',
        'dark-elevated': '#243333',
        'light-bg': '#FFFFFF',
        'light-surface': '#F3F5F4',
        'light-elevated': '#FFFFFF',
        // Archio landing-page palette (light editorial)
        'archio-cream': '#F6F4ED',
        'archio-sand': '#ECEBE4',
        'archio-forest': '#0E3A27',
        'archio-forest-dark': '#0B2E1F',
        'archio-ink': '#111111',
      },
      fontFamily: {
        'nura': ['Montserrat', 'sans-serif'],
        'outfit': ['Outfit', 'sans-serif'],
        'crimson': ['"Crimson Pro"', 'ui-serif', 'Georgia', 'serif'],
        'inter': ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'xs': '4px',
        's': '8px',
        'm': '16px',
        'l': '24px',
        'xl': '32px',
        '2xl': '48px',
      },
      borderRadius: {
        'card': '24px',
        'button': '999px',
        'button-rect': '12px',
        'bubble': '16px',
      },
      boxShadow: {
        'soft': '0 8px 32px rgba(32, 84, 85, 0.15)',
        'soft-lg': '0 12px 48px rgba(32, 84, 85, 0.2)',
        'soft-dark': '0 8px 32px rgba(0, 0, 0, 0.3)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #28B87A 0%, #205455 100%)',
      },
      animation: {
        'in': 'fadeIn 200ms ease-out',
        'scale-in': 'scaleIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-in-right': 'slideInRight 300ms cubic-bezier(0.22, 1, 0.36, 1)',
        'bounce-dot-1': 'bounceDot 1.4s ease-in-out infinite',
        'bounce-dot-2': 'bounceDot 1.4s ease-in-out 0.2s infinite',
        'bounce-dot-3': 'bounceDot 1.4s ease-in-out 0.4s infinite',
        'pulse-slow': 'pulseSlow 3s ease-in-out infinite',
        'shake': 'shake 300ms ease-in-out',
        'float': 'float 6s ease-in-out infinite',
        'fade-up': 'fadeUp 600ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'marquee': 'marquee 38s linear infinite',
      },
      keyframes: {
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(18px) scale(0.98)' }, '100%': { opacity: '1', transform: 'translateY(0) scale(1)' } },
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        scaleIn: { '0%': { transform: 'scale(0.9)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        slideInRight: { '0%': { transform: 'translateX(100%)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
        bounceDot: { '0%, 60%, 100%': { transform: 'translateY(0)' }, '30%': { transform: 'translateY(-6px)' } },
        pulseSlow: { '0%, 100%': { transform: 'scale(1)', opacity: '1' }, '50%': { transform: 'scale(1.05)', opacity: '0.9' } },
        shake: { '0%, 100%': { transform: 'translateX(0)' }, '25%': { transform: 'translateX(-4px)' }, '75%': { transform: 'translateX(4px)' } },
      },
    },
  },
  plugins: [],
};
export default config;
