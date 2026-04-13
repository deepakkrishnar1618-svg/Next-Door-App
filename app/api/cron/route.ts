import { NextRequest } from 'next/server';
import { getServiceClient } from '@/src/lib/api-helpers';
import { buildDailyDigestEmail } from '@/src/lib/email-templates';
import { sendEmail } from '@/src/lib/send-email';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret');
  if (!secret || secret !== process.env.CRON_WEBHOOK_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getServiceClient();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nextdoor.website';

    // Fetch all relevant settings in one query
    const { data: settingsRows } = await db
      .from('app_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'email_notifications_enabled',
        'email_send_days',
        'email_send_time',
        'email_last_sent',
      ]);

    const settings: Record<string, string> = {};
    for (const row of settingsRows ?? []) {
      const r = row as { setting_key: string; setting_value: string };
      settings[r.setting_key] = r.setting_value;
    }

    if (settings.email_notifications_enabled !== '1') {
      return Response.json({ success: true, sent: false, reason: 'Email notifications disabled' });
    }

    if (!process.env.RESEND_API_KEY) {
      return Response.json({ success: false, sent: false, reason: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    // ── Smart schedule check ───────────────────────────────────────────────
    const now = new Date();

    // Get current day and time in Europe/London timezone
    const londonParts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);

    const londonDay = (londonParts.find(p => p.type === 'weekday')?.value ?? '').toLowerCase();
    const londonHour = londonParts.find(p => p.type === 'hour')?.value ?? '00';
    const londonMinute = londonParts.find(p => p.type === 'minute')?.value ?? '00';
    const londonTimeStr = `${londonHour}:${londonMinute}`;

    // Today's date as YYYY-MM-DD in London time
    const londonDateStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now); // dd/mm/yyyy
    const [dd, mm, yyyy] = londonDateStr.split('/');
    const todayKey = `${yyyy}-${mm}-${dd}`;

    // Parse configured send days (JSON array e.g. ["monday","wednesday"])
    let sendDays: string[] = ['monday'];
    try {
      sendDays = JSON.parse(settings.email_send_days || '["monday"]');
    } catch {
      sendDays = ['monday'];
    }

    const sendTime = settings.email_send_time || '09:00'; // "HH:MM"
    const lastSent = settings.email_last_sent || '';

    // Check if current day is a send day
    const isDaySend = sendDays.includes(londonDay);

    // Check if we're within a 15-minute window of the configured send time
    const [configHour, configMin] = sendTime.split(':').map(Number);
    const configTotalMins = configHour * 60 + configMin;
    const currentTotalMins = parseInt(londonHour) * 60 + parseInt(londonMinute);
    const isTimeWindow = currentTotalMins >= configTotalMins && currentTotalMins < configTotalMins + 15;

    // Prevent double-send on same day
    const alreadySentToday = lastSent === todayKey;

    if (!isDaySend) {
      return Response.json({ success: true, sent: false, reason: `Not a send day (today: ${londonDay}, send days: ${sendDays.join(', ')})` });
    }
    if (!isTimeWindow) {
      return Response.json({ success: true, sent: false, reason: `Outside send window (now: ${londonTimeStr}, configured: ${sendTime})` });
    }
    if (alreadySentToday) {
      return Response.json({ success: true, sent: false, reason: `Already sent today (${todayKey})` });
    }

    // ── Fetch recipients ───────────────────────────────────────────────────
    const { data: recipientRows } = await db.from('email_notification_users').select('user_id');
    const recipientIds = (recipientRows ?? []).map((r: { user_id: string }) => r.user_id);

    if (recipientIds.length === 0) {
      return Response.json({ success: true, sent: false, reason: 'No recipients configured' });
    }

    const { data: recipients } = await db
      .from('users')
      .select('id, email, name')
      .in('id', recipientIds)
      .not('email', 'is', null);

    // ── Gather activity summary ────────────────────────────────────────────
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

    // ── Send emails ────────────────────────────────────────────────────────
    let sent = 0;
    let failed = 0;

    const dateLabel = now.toLocaleDateString('en-GB', {
      weekday: 'long', month: 'short', day: 'numeric', timeZone: 'Europe/London',
    });

    for (const recipient of recipients ?? []) {
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
      if (ok) { sent++; } else { failed++; }
      await new Promise(r => setTimeout(r, 100));
    }

    // Mark as sent today
    await db.from('app_settings').upsert({ setting_key: 'email_last_sent', setting_value: todayKey }, { onConflict: 'setting_key' });

    return Response.json({ success: true, sent: true, emails_sent: sent, emails_failed: failed, ran_at: now.toISOString() });
  } catch (e) {
    console.error('[Cron] Email digest error:', e);
    return Response.json({ success: false, sent: false, reason: String(e) }, { status: 500 });
  }
}

// Support GET for manual testing
export { POST as GET };
