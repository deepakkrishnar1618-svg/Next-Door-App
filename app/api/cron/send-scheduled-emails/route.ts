import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/src/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    const secretFromQuery = request.nextUrl.searchParams.get('secret');
    const secretFromHeader = request.headers.get('X-Cron-Secret');
    const providedSecret = secretFromQuery || secretFromHeader || '';
    const webhookSecret = process.env.CRON_WEBHOOK_SECRET || '';

    if (!webhookSecret || providedSecret !== webhookSecret) {
      return NextResponse.json({ success: false, message: 'Invalid or missing secret' }, { status: 401 });
    }

    const forceRun = request.nextUrl.searchParams.get('force') === 'true';
    const resetDate = request.nextUrl.searchParams.get('reset') === 'true';

    const db = getServiceClient();

    if (resetDate) {
      await db.from('app_settings').delete().eq('setting_key', 'last_scheduled_email_date');
      return NextResponse.json({ success: true, message: 'Reset last_scheduled_email_date.' });
    }

    // Check if enabled
    const { data: enabledRow } = await db.from('app_settings').select('setting_value').eq('setting_key', 'email_notifications_enabled').maybeSingle();
    if (!enabledRow || enabledRow.setting_value !== '1') {
      return NextResponse.json({ success: true, message: 'Email notifications disabled.' });
    }

    // Check if already sent today (unless force)
    if (!forceRun) {
      const today = new Date().toISOString().split('T')[0];
      const { data: lastSent } = await db.from('app_settings').select('setting_value').eq('setting_key', 'last_scheduled_email_date').maybeSingle();
      if (lastSent?.setting_value === today) {
        return NextResponse.json({ success: true, message: 'Already sent today.' });
      }
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return NextResponse.json({ success: false, message: 'RESEND_API_KEY not configured' }, { status: 500 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nextdoor.website';

    // Get recipients
    const { data: recipientRows } = await db.from('email_notification_users').select('user_id');
    const recipientIds = (recipientRows || []).map((r: { user_id: string }) => r.user_id);

    if (!recipientIds.length) {
      return NextResponse.json({ success: true, message: 'No recipients configured.', sent: 0 });
    }

    const { data: users } = await db
      .from('users')
      .select('id, email, name')
      .eq('is_active', true)
      .not('email', 'is', null)
      .in('id', recipientIds);

    let sent = 0, failed = 0;
    for (const u of (users || [])) {
      if (!u.email?.includes('@')) { failed++; continue; }
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Next Door <noreply@nextdoor.website>',
          reply_to: 'deepakkrishnar1618@gmail.com',
          to: u.email,
          subject: '🏠 Next Door - You have new activity!',
          html: `<p>There are unread messages and new events from your neighbors. <a href="${appUrl}/chat">Open Next Door →</a></p>`,
        }),
      });
      if (res.ok) sent++; else failed++;
      await new Promise(r => setTimeout(r, 100));
    }

    // Record last sent date
    const today = new Date().toISOString().split('T')[0];
    await db.from('app_settings').upsert({ setting_key: 'last_scheduled_email_date', setting_value: today }, { onConflict: 'setting_key' });

    return NextResponse.json({ success: true, sent, failed, total: users?.length || 0 });
  } catch (e) {
    console.error('[Cron] Error:', e);
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}
