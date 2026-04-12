import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest) {
  // Vercel Cron authenticates via Authorization header with CRON_SECRET
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getServiceClient();
    const apiKey = process.env.RESEND_API_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nextdoor.website';

    // Check if email notifications are enabled
    const { data: enabledRow } = await db
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'email_notifications_enabled')
      .maybeSingle();

    if (enabledRow?.setting_value !== '1') {
      return NextResponse.json({ success: true, message: 'Email notifications disabled', sent: 0 });
    }

    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    // Fetch recipients from email_notification_users
    const { data: recipientRows } = await db
      .from('email_notification_users')
      .select('user_id');

    const recipientIds = (recipientRows || []).map((r: { user_id: string }) => r.user_id);
    if (recipientIds.length === 0) {
      return NextResponse.json({ success: true, message: 'No recipients configured', sent: 0 });
    }

    const { data: recipients } = await db
      .from('users')
      .select('id, email, name')
      .in('id', recipientIds)
      .not('email', 'is', null);

    // Gather activity summary for the email
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: newMessages },
      { count: activeEvents },
      { count: activeListings },
    ] = await Promise.all([
      db.from('messages').select('*', { count: 'exact', head: true })
        .eq('group_id', 'main').eq('is_deleted', false).gte('created_at', yesterday),
      db.from('events').select('*', { count: 'exact', head: true })
        .gt('end_datetime', now.toISOString()),
      db.from('market_listings').select('*', { count: 'exact', head: true })
        .eq('status', 'open'),
    ]);

    let sent = 0;
    let failed = 0;

    for (const recipient of (recipients || [])) {
      if (!recipient.email?.includes('@')) { failed++; continue; }

      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Next Door Daily Digest</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
            .container { max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
            .header { background: #166534; padding: 32px 32px 24px; text-align: center; }
            .header h1 { color: white; margin: 0 0 4px; font-size: 24px; }
            .header p { color: #bbf7d0; margin: 0; font-size: 14px; }
            .body { padding: 32px; }
            .greeting { font-size: 16px; color: #374151; margin-bottom: 24px; }
            .stats { display: flex; gap: 12px; margin-bottom: 28px; }
            .stat { flex: 1; background: #f0fdf4; border-radius: 12px; padding: 16px; text-align: center; }
            .stat-value { font-size: 28px; font-weight: 700; color: #166534; display: block; }
            .stat-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; display: block; }
            .cta { display: block; text-align: center; background: #22c55e; color: white; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 16px; margin: 24px 0; }
            .footer { padding: 20px 32px; background: #f8fafc; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏠 Next Door</h1>
              <p>Your daily neighborhood digest</p>
            </div>
            <div class="body">
              <p class="greeting">Hi ${recipient.name},</p>
              <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">Here's what happened in your building today:</p>
              <div class="stats">
                <div class="stat">
                  <span class="stat-value">${newMessages ?? 0}</span>
                  <span class="stat-label">New Messages</span>
                </div>
                <div class="stat">
                  <span class="stat-value">${activeEvents ?? 0}</span>
                  <span class="stat-label">Active Events</span>
                </div>
                <div class="stat">
                  <span class="stat-value">${activeListings ?? 0}</span>
                  <span class="stat-label">Open Requests</span>
                </div>
              </div>
              <a href="${appUrl}/chat" class="cta">Open Next Door →</a>
            </div>
            <div class="footer">
              You're receiving this because you're subscribed to daily digests.<br>
              Contact your building admin to unsubscribe.
            </div>
          </div>
        </body>
        </html>
      `;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Next Door <noreply@nextdoor.website>',
          to: recipient.email,
          subject: `🏠 Next Door Daily Digest — ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`,
          html: htmlBody,
        }),
      });

      if (res.ok) { sent++; } else { failed++; }
      await new Promise(r => setTimeout(r, 100));
    }

    return NextResponse.json({ success: true, sent, failed, ran_at: now.toISOString() });
  } catch (e) {
    console.error('[Cron] Email digest error:', e);
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}

// Also support POST for backwards compatibility
export { GET as POST };
