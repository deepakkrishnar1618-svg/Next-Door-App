import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';
import { isRateLimited, getClientIp } from '@/src/lib/rate-limit';
import { buildDailyDigestEmail } from '@/src/lib/email-templates';
import { sendEmail } from '@/src/lib/send-email';

export async function POST(request: NextRequest) {
  if (isRateLimited(getClientIp(request), 'admin:send-notification', 5)) return error('Too many requests', 429);
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: caller } = await db.from('users').select('is_admin').eq('id', userId).single();
  if (!caller || (caller.is_admin !== 1 && caller.is_admin !== true)) return error('Only admins can send immediate notifications', 403);

  if (!process.env.RESEND_API_KEY) return json({ success: false, error: 'RESEND_API_KEY is not configured', sent: 0, failed: 0 }, 400);

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

  // Gather activity summary
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

  const dateLabel = now.toLocaleDateString('en-GB', {
    weekday: 'long', month: 'short', day: 'numeric', timeZone: 'Europe/London',
  });

  let sent = 0, failed = 0;
  for (const recipient of users) {
    if (!recipient.email?.includes('@')) { failed++; continue; }

    const { subject, html } = buildDailyDigestEmail({
      recipientName: recipient.name || 'Neighbour',
      messageCount: newMessages ?? 0,
      eventCount: activeEvents ?? 0,
      requestCount: activeListings ?? 0,
      appUrl,
      dateLabel,
    });

    const ok = await sendEmail(recipient.email, subject, html);
    if (ok) sent++; else failed++;
    await new Promise(r => setTimeout(r, 100));
  }

  return json({ success: true, sent, failed, total: users.length });
}
