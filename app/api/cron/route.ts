import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getServiceClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const dissolveThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  // ── 1. Auto-delete dissolved events (ended > 24h ago) ────────────────────
  const { data: dissolvedEvents } = await db
    .from('events')
    .select('id, name, description, start_datetime, end_datetime, location, max_members, image_url, creator_user_id, message_id')
    .lt('end_datetime', dissolveThreshold);

  let deletedEvents = 0;
  for (const evt of dissolvedEvents ?? []) {
    const rec = evt as Record<string, unknown>;
    const eventId = rec.id as number;
    try {
      const { data: eventMsgs } = await db
        .from('event_messages')
        .select('id, attachments:event_message_attachments(file_key)')
        .eq('event_id', eventId);
      const msgIds = (eventMsgs || []).map((m: Record<string, unknown>) => m.id as number);

      if (msgIds.length > 0) {
        await db.from('event_message_reads').delete().in('event_message_id', msgIds);
        await db.from('event_message_reactions').delete().in('event_message_id', msgIds);
        await db.from('event_message_attachments').delete().in('event_message_id', msgIds);
      }

      const fileKeys: string[] = [];
      for (const msg of eventMsgs ?? []) {
        const atts = (msg as Record<string, unknown>).attachments as Array<{ file_key: string }> | null;
        for (const att of atts ?? []) {
          if (att.file_key) fileKeys.push(att.file_key);
        }
      }
      if (fileKeys.length > 0) {
        const byBucket: Record<string, string[]> = {};
        for (const fk of fileKeys) {
          const parts = fk.split('/');
          const bucket = parts[0];
          const path = parts.slice(1).join('/');
          if (!byBucket[bucket]) byBucket[bucket] = [];
          byBucket[bucket].push(path);
        }
        for (const [bucket, paths] of Object.entries(byBucket)) {
          await db.storage.from(bucket).remove(paths);
        }
      }

      await db.from('event_messages').delete().eq('event_id', eventId);
      await db.from('event_members').delete().eq('event_id', eventId);
      await db.from('typing_status').delete().eq('group_type', 'event').eq('group_id', String(eventId));

      if (rec.message_id) {
        await db.from('notifications').delete().eq('message_id', rec.message_id as number);
        await db.from('messages').update({
          is_deleted: true,
          content: `"${rec.name}" event has been deleted`,
          updated_at: nowIso,
        }).eq('id', rec.message_id as number);
      }

      const { data: creatorUser } = await db.from('users').select('name, room_number').eq('id', rec.creator_user_id as string).maybeSingle();
      const { count: memberCount } = await db.from('event_members').select('*', { count: 'exact', head: true }).eq('event_id', eventId);
      const { data: existing } = await db.from('event_history').select('id').eq('event_id', eventId).maybeSingle();
      if (!existing) {
        await db.from('event_history').insert({
          event_id: eventId,
          name: rec.name, description: rec.description, location: rec.location,
          start_datetime: rec.start_datetime, end_datetime: rec.end_datetime,
          max_members: rec.max_members, image_url: rec.image_url,
          creator_user_id: rec.creator_user_id,
          creator_name: (creatorUser as Record<string, unknown>)?.name || null,
          creator_room: (creatorUser as Record<string, unknown>)?.room_number || null,
          total_attendees: memberCount || 0,
          is_deleted: false,
          ended_at: nowIso,
        });
      }

      await db.from('events').delete().eq('id', eventId);
      deletedEvents++;
    } catch (err) {
      console.error(`[Cron] Failed to delete dissolved event ${eventId}:`, err);
    }
  }

  // ── 2. Expire stale announcements ─────────────────────────────────────────
  await db
    .from('messages')
    .update({ is_active_announcement: false })
    .eq('is_active_announcement', true)
    .lt('announcement_expires_at', nowIso);

  // ── 3. Daily email digest ─────────────────────────────────────────────────
  try {
    const apiKey = process.env.RESEND_API_KEY;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://nextdoor.website';

    const { data: enabledRow } = await db
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'email_notifications_enabled')
      .maybeSingle();

    if (enabledRow?.setting_value !== '1' || !apiKey) {
      return NextResponse.json({
        success: true,
        deleted_events: deletedEvents,
        sent: 0,
        message: enabledRow?.setting_value !== '1' ? 'Email notifications disabled' : 'RESEND_API_KEY not configured',
        ran_at: nowIso,
      });
    }

    const { data: recipientRows } = await db.from('email_notification_users').select('user_id');
    const recipientIds = (recipientRows || []).map((r: { user_id: string }) => r.user_id);

    if (recipientIds.length === 0) {
      return NextResponse.json({ success: true, deleted_events: deletedEvents, sent: 0, message: 'No recipients configured', ran_at: nowIso });
    }

    const { data: recipients } = await db.from('users').select('id, email, name').in('id', recipientIds).not('email', 'is', null);

    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const [
      { count: newMessages },
      { count: activeEvents },
      { count: activeListings },
    ] = await Promise.all([
      db.from('messages').select('*', { count: 'exact', head: true }).eq('group_id', 'main').eq('is_deleted', false).gte('created_at', yesterday),
      db.from('events').select('*', { count: 'exact', head: true }).gt('end_datetime', nowIso),
      db.from('market_listings').select('*', { count: 'exact', head: true }).eq('status', 'open'),
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

    return NextResponse.json({ success: true, deleted_events: deletedEvents, sent, failed, ran_at: nowIso });
  } catch (e) {
    console.error('[Cron] Email digest error:', e);
    return NextResponse.json({ success: false, deleted_events: deletedEvents, message: String(e), ran_at: nowIso }, { status: 500 });
  }
}

export { GET as POST };
