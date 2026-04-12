import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function POST(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: caller } = await db.from('users').select('is_admin').eq('id', userId).single();
  if (!caller || (caller.is_admin !== 1 && caller.is_admin !== true)) return error('Only admins can send immediate notifications', 403);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return json({ success: false, error: 'RESEND_API_KEY is not configured', sent: 0, failed: 0 }, 400);

  const body = await request.json().catch(() => ({}));
  const { user_ids } = body;
  if (!user_ids?.length) return json({ success: false, error: 'No recipients selected', sent: 0, failed: 0 }, 400);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nextdoor.website';

  // Fetch recipients — is_active is integer 1/0, not boolean
  const { data: users } = await db
    .from('users')
    .select('id, email, name')
    .neq('is_active', 0)
    .not('email', 'is', null)
    .in('id', user_ids);

  if (!users?.length) return json({ success: false, error: 'No valid recipients found', sent: 0, failed: 0 }, 400);

  // Gather activity summary for the email
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const [
    { count: newMessages },
    { count: activeEvents },
    { count: activeListings },
  ] = await Promise.all([
    db.from('messages').select('*', { count: 'exact', head: true }).eq('group_id', 'main').eq('is_deleted', false).gte('created_at', yesterday),
    db.from('events').select('*', { count: 'exact', head: true }).gt('end_datetime', now.toISOString()),
    db.from('market_listings').select('*', { count: 'exact', head: true }).eq('status', 'open'),
  ]);

  let sent = 0, failed = 0;
  for (const recipient of users) {
    if (!recipient.email?.includes('@')) { failed++; continue; }

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Next Door - New Activity</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
          .header { background: #166534; padding: 32px 32px 24px; text-align: center; }
          .header h1 { color: white; margin: 0 0 4px; font-size: 24px; }
          .header p { color: #bbf7d0; margin: 0; font-size: 14px; }
          .body { padding: 32px; }
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
            <p>You have new activity!</p>
          </div>
          <div class="body">
            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">Hi ${recipient.name},</p>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 20px;">Here's what's happening in your building:</p>
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
            Sent by your building admin.<br>
            Contact your admin to unsubscribe.
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
        reply_to: 'deepakkrishnar1618@gmail.com',
        to: recipient.email,
        subject: '🏠 Next Door — You have new activity!',
        html: htmlBody,
      }),
    });
    if (res.ok) sent++; else failed++;
    await new Promise(r => setTimeout(r, 100));
  }

  return json({ success: true, sent, failed, total: users.length });
}
