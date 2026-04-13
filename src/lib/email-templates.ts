const CONTACT_EMAIL = 'deepakkrishnar1618@gmail.com';
const APP_URL_DEFAULT = 'https://nextdoor.website';

export function buildBaseTemplate(content: string, appUrl = APP_URL_DEFAULT): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Next Door</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#10B981,#0D9488);padding:32px 32px 28px;text-align:center;">
            <p style="margin:0 0 8px;font-size:32px;line-height:1;">🏠</p>
            <h1 style="margin:0 0 4px;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">Next Door</h1>
            <p style="margin:0;color:rgba(255,255,255,0.85);font-size:14px;">Your neighbourhood community</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 24px;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;">
              <a href="${appUrl}" style="color:#0D9488;text-decoration:none;font-weight:500;">nextdoor.website</a>
            </p>
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              Enquiries: <a href="mailto:${CONTACT_EMAIL}" style="color:#0D9488;text-decoration:none;">${CONTACT_EMAIL}</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Daily Digest ──────────────────────────────────────────────────────────────

interface DigestStats {
  recipientName: string;
  messageCount: number;
  eventCount: number;
  requestCount: number;
  appUrl?: string;
  dateLabel?: string;
}

export function buildDailyDigestEmail(stats: DigestStats): { subject: string; html: string } {
  const appUrl = stats.appUrl ?? APP_URL_DEFAULT;
  const subject = `🏠 Next Door — ${stats.dateLabel ?? 'Your daily digest'}`;

  const content = `
    <h2 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0f172a;">Hi ${stats.recipientName},</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">Here's what happened in your building today:</p>

    <!-- Stats row -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td width="33%" style="padding:0 6px 0 0;">
          <div style="background:#f0fdf4;border-radius:12px;padding:16px 12px;text-align:center;">
            <p style="margin:0 0 4px;font-size:28px;font-weight:700;color:#15803d;">${stats.messageCount}</p>
            <p style="margin:0;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">💬 New Messages</p>
          </div>
        </td>
        <td width="33%" style="padding:0 3px;">
          <div style="background:#eff6ff;border-radius:12px;padding:16px 12px;text-align:center;">
            <p style="margin:0 0 4px;font-size:28px;font-weight:700;color:#1d4ed8;">${stats.eventCount}</p>
            <p style="margin:0;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">📅 Active Events</p>
          </div>
        </td>
        <td width="33%" style="padding:0 0 0 6px;">
          <div style="background:#fff7ed;border-radius:12px;padding:16px 12px;text-align:center;">
            <p style="margin:0 0 4px;font-size:28px;font-weight:700;color:#c2410c;">${stats.requestCount}</p>
            <p style="margin:0;font-size:10px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">🤝 Open Requests</p>
          </div>
        </td>
      </tr>
    </table>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="${appUrl}/chat" style="display:inline-block;background:linear-gradient(135deg,#10B981,#0D9488);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 36px;border-radius:10px;">Open Next Door →</a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
      You're receiving this as part of the Next Door community.<br>
      To unsubscribe contact: <a href="mailto:${CONTACT_EMAIL}" style="color:#0D9488;text-decoration:none;">${CONTACT_EMAIL}</a>
    </p>
  `;

  return { subject, html: buildBaseTemplate(content, appUrl) };
}

// ── Welcome ───────────────────────────────────────────────────────────────────

export function buildWelcomeEmail(name: string, appUrl = APP_URL_DEFAULT): { subject: string; html: string } {
  const subject = '🏠 Welcome to Next Door!';

  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Welcome to Next Door, ${name}! 🎉</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">You're now part of the Next Door community. Here's how to get started:</p>

    <!-- Getting started steps -->
    <div style="background:#f8fafc;border-radius:12px;padding:20px;margin-bottom:28px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:8px 0;font-size:14px;color:#374151;border-bottom:1px solid #e2e8f0;">✅&nbsp;&nbsp;Say hello in the main chat</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#374151;border-bottom:1px solid #e2e8f0;">📅&nbsp;&nbsp;Check upcoming events in your building</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#374151;border-bottom:1px solid #e2e8f0;">🤝&nbsp;&nbsp;Browse quick requests from neighbours</td></tr>
        <tr><td style="padding:8px 0;font-size:14px;color:#374151;">👤&nbsp;&nbsp;Complete your profile with a photo</td></tr>
      </table>
    </div>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="${appUrl}/chat" style="display:inline-block;background:linear-gradient(135deg,#10B981,#0D9488);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 36px;border-radius:10px;">Start Chatting →</a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
      Questions? Contact: <a href="mailto:${CONTACT_EMAIL}" style="color:#0D9488;text-decoration:none;">${CONTACT_EMAIL}</a>
    </p>
  `;

  return { subject, html: buildBaseTemplate(content, appUrl) };
}

// ── Account Blocked ───────────────────────────────────────────────────────────

export function buildAccountBlockedEmail(name: string, appUrl = APP_URL_DEFAULT): { subject: string; html: string } {
  const subject = 'Your Next Door account has been suspended';

  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Account Suspended</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;">Hi ${name}, your Next Door account has been temporarily suspended.</p>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">If you believe this is a mistake or would like more information, please contact the community admin:</p>

    <!-- Contact box -->
    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#92400e;">
        📧&nbsp;&nbsp;<a href="mailto:${CONTACT_EMAIL}" style="color:#92400e;font-weight:600;text-decoration:none;">${CONTACT_EMAIL}</a>
      </p>
    </div>

    <p style="margin:0;font-size:13px;color:#94a3b8;">
      You will not be able to access Next Door until your account is reactivated by an admin.
    </p>
  `;

  return { subject, html: buildBaseTemplate(content, appUrl) };
}

// ── Account Deleted ───────────────────────────────────────────────────────────

export function buildAccountDeletedEmail(name: string, appUrl = APP_URL_DEFAULT): { subject: string; html: string } {
  const subject = 'Your Next Door account has been removed';

  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Account Removed</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;">Hi ${name}, your Next Door account and associated data have been removed from our community.</p>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">If you have any questions, please contact:</p>

    <!-- Contact box -->
    <div style="background:#fee2e2;border:1px solid #ef4444;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#991b1b;">
        📧&nbsp;&nbsp;<a href="mailto:${CONTACT_EMAIL}" style="color:#991b1b;font-weight:600;text-decoration:none;">${CONTACT_EMAIL}</a>
      </p>
    </div>

    <p style="margin:0;font-size:13px;color:#94a3b8;">
      You can re-register with the same email address if permitted by the admin.
    </p>
  `;

  return { subject, html: buildBaseTemplate(content, appUrl) };
}

// ── Account Reactivated ───────────────────────────────────────────────────────

export function buildAccountReactivatedEmail(name: string, appUrl = APP_URL_DEFAULT): { subject: string; html: string } {
  const subject = 'Your Next Door account has been reactivated';

  const content = `
    <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Welcome Back! 🎉</h2>
    <p style="margin:0 0 16px;font-size:15px;color:#475569;">Good news, ${name}! Your Next Door account has been reactivated.</p>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;">You can now sign in and rejoin your community.</p>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="${appUrl}" style="display:inline-block;background:linear-gradient(135deg,#10B981,#0D9488);color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:14px 36px;border-radius:10px;">Sign In to Next Door →</a>
        </td>
      </tr>
    </table>

    <!-- Info box -->
    <div style="background:#d1fae5;border:1px solid #10B981;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:4px 0;font-size:14px;color:#065f46;">✅&nbsp;&nbsp;Your account is now fully active</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#065f46;">✅&nbsp;&nbsp;Your previous messages are still visible</td></tr>
        <tr><td style="padding:4px 0;font-size:14px;color:#065f46;">✅&nbsp;&nbsp;You can rejoin events and requests</td></tr>
      </table>
    </div>

    <p style="margin:0;font-size:13px;color:#94a3b8;text-align:center;">
      Questions? Contact: <a href="mailto:${CONTACT_EMAIL}" style="color:#0D9488;text-decoration:none;">${CONTACT_EMAIL}</a>
    </p>
  `;

  return { subject, html: buildBaseTemplate(content, appUrl) };
}
