'use client';
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsOfService() {
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
            Terms of Service
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
              Agreement to Terms
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              By accessing or using Next Door, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Eligibility
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Next Door is exclusively for residents of the Interchange community. By using this service, you represent that:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2 mt-4">
              <li>You are a current resident of the Interchange building</li>
              <li>You are at least 18 years of age</li>
              <li>The room/apartment number you provide is accurate</li>
              <li>You will not share your account access with non-residents</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Account Responsibilities
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li>Maintaining the security of your Google account used to sign in</li>
              <li>All activity that occurs under your account</li>
              <li>Keeping your profile information accurate and up-to-date, including your bio</li>
              <li>Notifying us if you believe your account has been compromised</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Application Features
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Next Door provides the following features for community interaction:
            </p>
            
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mt-6 mb-3">
              Community Chat
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              A shared messaging space for all residents. Messages support text, images (up to 30MB), file attachments (up to 5 files per message), reactions, replies, and link previews. Typing indicators and read receipts help you see when others are engaging.
            </p>

            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mt-6 mb-3">
              Events
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Create and join community events with titles, descriptions, dates, times, locations, and optional images. Each event has its own dedicated chat for participants to coordinate. Events are automatically archived 24 hours after they end, with chat history preserved in Event History.
            </p>

            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mt-6 mb-3">
              Quick Requests
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Post requests for help or offer assistance to neighbors. Requests can be for sale, rent, buying, or lending items and services. Each request has a dedicated discussion chat. Request creators can select a winner and acknowledge helpers when marking a request as complete. Completed requests are preserved in Request History.
            </p>

            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mt-6 mb-3">
              Profiles
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              View your profile and other residents' profiles, including bio, activity statistics (messages sent, events created/attended, requests created, times helped others), and shared media gallery.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Acceptable Use
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              You agree to use Next Door in a respectful manner that fosters positive community interaction. You may NOT use the service to:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li>Harass, bully, threaten, or intimidate other residents</li>
              <li>Post discriminatory, hateful, or offensive content</li>
              <li>Share illegal content or promote illegal activities</li>
              <li>Spam or send unsolicited commercial messages</li>
              <li>Impersonate other residents or misrepresent your identity</li>
              <li>Share private information about others without consent</li>
              <li>Attempt to access other users' accounts</li>
              <li>Interfere with or disrupt the service</li>
              <li>Upload malware, viruses, or harmful content</li>
              <li>Use automated systems or bots to access the service</li>
              <li>Create misleading events or requests</li>
              <li>Abuse the winner/helper selection system in requests</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Content Ownership and License
            </h2>
            
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mt-6 mb-3">
              Your Content
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              You retain ownership of the content you post (messages, images, event details, request listings, profile bio, etc.). By posting content, you grant Next Door a non-exclusive, royalty-free license to display, distribute, and store that content as necessary to provide the service to you and other community members.
            </p>

            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mt-6 mb-3">
              Our Content
            </h3>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              The Next Door application, including its design, features, and branding, is owned by us and protected by intellectual property laws. You may not copy, modify, or distribute any part of the application without permission.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Community Administration
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Next Door has community administrators who help maintain a positive environment. Administrators have the right to:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li>Remove or edit content that violates these terms</li>
              <li>Pin important messages for community visibility</li>
              <li>Deactivate (block) users temporarily who violate community guidelines</li>
              <li>Permanently delete user accounts for serious violations</li>
              <li>Access message history for moderation purposes</li>
              <li>Manage events and requests as needed</li>
              <li>View user activity and statistics for moderation</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Account Status
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Your account may be affected in the following ways:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li><strong>Deactivation (Blocking):</strong> Administrators may temporarily block your account for policy violations. Your profile and message history remain visible but marked as "Deactivated." Deactivated accounts can be reactivated by administrators.</li>
              <li><strong>Deletion:</strong> Your account may be permanently deleted for serious violations or at your request. Deleted accounts are marked as "Deleted" and cannot be reactivated. You may re-register with the same email address, which creates a new account.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Account Termination
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
              Your account may be suspended or terminated if:
            </p>
            <ul className="list-disc pl-6 text-slate-600 dark:text-slate-300 space-y-2">
              <li>You violate these Terms of Service</li>
              <li>You are no longer a resident of the Interchange community</li>
              <li>You engage in behavior harmful to other community members</li>
              <li>You request account deletion</li>
            </ul>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed mt-4">
              You may request deletion of your account at any time through your profile settings. Upon deletion, your personal data will be removed according to our Privacy Policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Disclaimer of Warranties
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Next Door is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the service will be uninterrupted, secure, or error-free. We are not responsible for the accuracy or reliability of any content posted by users, including event details, request listings, or profile information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Limitation of Liability
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              To the maximum extent permitted by law, Next Door and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service, including but not limited to disputes between residents, failed transactions or requests, event-related issues, lost data, or service interruptions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Indemnification
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              You agree to indemnify and hold harmless Next Door and its operators from any claims, damages, or expenses arising from your use of the service or violation of these terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Changes to Terms
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              We reserve the right to modify these Terms of Service at any time. We will notify users of significant changes through the application. Continued use of the service after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Governing Law
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              These terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-4">
              Contact Us
            </h2>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              If you have questions about these Terms of Service, please contact us at:{' '}
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
            <Link href="/privacy" className="text-emerald-600 dark:text-primary-mint hover:underline">
              Privacy Policy
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
