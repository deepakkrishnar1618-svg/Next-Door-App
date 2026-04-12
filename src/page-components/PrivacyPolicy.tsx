'use client';
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-ocean">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-dark-surface/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <Link 
            href="/" 
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-elevated transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </Link>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-white">
            Privacy Policy
          </h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Introduction
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Next Door ("we," "our," or "us") is a neighborhood chat application designed exclusively for residents of the Next Door community. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Information We Collect
            </h2>
            
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mt-6 mb-3">
              Account Information
            </h3>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li>Name (from your Google account)</li>
              <li>Email address (from your Google account)</li>
              <li>Profile picture (from your Google account or uploaded by you)</li>
              <li>Room/apartment number (provided by you during setup)</li>
              <li>Bio (optional, up to 500 characters)</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mt-6 mb-3">
              User-Generated Content
            </h3>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li>Messages sent in community chat, event chats, and request discussions</li>
              <li>Event details (title, description, date, time, location, images)</li>
              <li>Request listings (title, description, type, price, images)</li>
              <li>Images and files you upload (up to 30MB per file, 5 attachments per message)</li>
              <li>Reactions and interactions with other users' content</li>
              <li>Reply threads and message references</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mt-6 mb-3">
              Activity Information
            </h3>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li>Login timestamps and online status</li>
              <li>Message read receipts (when you view messages)</li>
              <li>Typing indicators (real-time, not stored long-term)</li>
              <li>Event participation (creation, attendance)</li>
              <li>Request activity (creation, interest, winner/helper status)</li>
              <li>Notification preferences</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mt-6 mb-3">
              Statistics and Metrics
            </h3>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li>Messages sent count</li>
              <li>Events created and attended count</li>
              <li>Requests created count</li>
              <li>Times you've helped others (helper acknowledgment)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              How We Use Your Information
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li>Provide and maintain the Next Door chat service</li>
              <li>Display your profile to other community members</li>
              <li>Send you notifications about messages, events, and requests</li>
              <li>Enable community features like event planning, request coordination, and group discussions</li>
              <li>Show read receipts and typing indicators to enhance communication</li>
              <li>Display activity statistics on your profile</li>
              <li>Verify you are a resident of the Next Door community</li>
              <li>Maintain security and prevent abuse</li>
              <li>Archive completed events and requests for history viewing</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Information Sharing
            </h2>
            
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mt-6 mb-3">
              With Other Community Members
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              The following information is visible to other verified residents:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li>Your name, profile picture, and room number</li>
              <li>Your bio and profile statistics</li>
              <li>Your online/offline status</li>
              <li>Messages you send in community, event, and request chats</li>
              <li>Events and requests you create</li>
              <li>When you've read messages (read receipts)</li>
              <li>When you're typing (typing indicators)</li>
              <li>Your shared media gallery</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mt-6 mb-3">
              Third-Party Services
            </h3>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li><strong>Google:</strong> We use Google Sign-In for authentication. Google receives information necessary to verify your identity.</li>
              <li><strong>Resend:</strong> We use Resend to send transactional emails (notifications, account status updates). They receive your email address for delivery purposes only.</li>
              <li><strong>Cloudflare:</strong> Our application and file storage are hosted on Cloudflare infrastructure for performance and security.</li>
            </ul>

            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mt-6 mb-3">
              We Do Not
            </h3>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li>Sell your personal information to third parties</li>
              <li>Share your data with advertisers</li>
              <li>Use your data for purposes unrelated to the Next Door service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Data Storage and Security
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Your data is stored on secure cloud infrastructure (Cloudflare). We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. Uploaded files are stored securely with access controls to ensure only authorized community members can view them.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Your Rights
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li><strong>Access:</strong> View the personal information we hold about you through your profile</li>
              <li><strong>Update:</strong> Modify your profile information, bio, and avatar at any time</li>
              <li><strong>Delete:</strong> Request deletion of your account, which will remove your personal data from the system</li>
              <li><strong>Withdraw consent:</strong> Stop using the service at any time</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Data Retention
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              We retain your data according to the following policies:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li><strong>Account data:</strong> Retained while your account is active</li>
              <li><strong>Messages:</strong> Retained in chat history; may be retained in anonymized form after account deletion to maintain conversation continuity</li>
              <li><strong>Events:</strong> Automatically archived 24 hours after ending; archived data retained in Event History</li>
              <li><strong>Requests:</strong> Archived when marked complete; retained in Request History with associated helper acknowledgments</li>
              <li><strong>Typing indicators:</strong> Automatically cleared after 5 seconds of inactivity</li>
              <li><strong>Uploaded files:</strong> Deleted when associated content is removed or account is deleted</li>
            </ul>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mt-4">
              If your account is deleted, your personal information will be removed, but historical messages may show "Deleted" in place of your name.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Cookies and Local Storage
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              We use cookies and local storage to maintain your login session and remember your preferences (such as dark/light mode). These are essential for the app to function properly. For more details, see our <Link href="/cookies" className="text-emerald-600 dark:text-primary-mint hover:underline">Cookie Policy</Link>.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Changes to This Policy
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Contact Us
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              If you have questions about this Privacy Policy or your personal data, please contact us at:{' '}
              <a 
                href="mailto:deepakkrishnar1618@gmail.com" 
                className="text-emerald-600 dark:text-primary-mint hover:underline"
              >
                deepakkrishnar1618@gmail.com
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-700 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            © {new Date().getFullYear()} Next Door. All rights reserved.
          </p>
          <div className="mt-2 flex justify-center gap-4 text-sm">
            <Link href="/terms" className="text-emerald-600 dark:text-primary-mint hover:underline">
              Terms of Service
            </Link>
            <Link href="/cookies" className="text-emerald-600 dark:text-primary-mint hover:underline">
              Cookie Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
