import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/src/lib/auth-hook";
import { ThemeProvider } from "@/src/context/ThemeContext";
import { ToastProvider } from "@/src/context/ToastContext";
import { Analytics } from "@vercel/analytics/next";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Next Door",
  description: "Your neighbourhood chat",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <AuthProvider>
          <ThemeProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </ThemeProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
