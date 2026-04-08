import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function POST(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: caller } = await db.from('users').select('is_admin').eq('id', userId).single();
  if (!caller || (caller.is_admin !== 1 && caller.is_admin !== true)) return error('Only admins can send immediate notifications', 403);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return json({ success: false, error: 'RESEND_API_KEY is not configured' }, 400);

  const body = await request.json().catch(() => ({}));
  const { user_ids } = body;
  if (!user_ids?.length) return json({ success: false, error: 'No recipients selected' }, 400);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nextdoor.website';

  const { data: users } = await db
    .from('users')
    .select('id, email, name')
    .eq('is_active', true)
    .eq('profile_completed', true)
    .not('email', 'is', null)
    .in('id', user_ids);

  if (!users?.length) return json({ success: false, error: 'No valid recipients found' }, 400);

  let sent = 0, failed = 0;
  for (const recipient of users) {
    if (!recipient.email?.includes('@')) { failed++; continue; }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Next Door <noreply@nextdoor.website>',
        to: recipient.email,
        subject: '🏠 Next Door - You have new activity!',
        html: `<p>There are unread messages and new events from your neighbors. <a href="${appUrl}/chat">Open Next Door →</a></p>`,
      }),
    });
    if (res.ok) sent++; else failed++;
    await new Promise(r => setTimeout(r, 100));
  }

  return json({ success: true, sent, failed, total: users.length });
}
