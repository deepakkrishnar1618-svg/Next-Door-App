import { NextRequest } from 'next/server';
import { getServiceClient } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getServiceClient();

    const now = new Date().toISOString();
    const dissolveThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // ── 1. Auto-delete dissolved events (ended more than 24h ago) ────────────
    const { data: dissolvedEvents } = await db
      .from('events')
      .select('id, name, description, start_datetime, end_datetime, location, max_members, image_url, creator_user_id, message_id')
      .lt('end_datetime', dissolveThreshold);

    for (const event of dissolvedEvents ?? []) {
      const rec = event as Record<string, unknown>;
      const eventId = rec.id as number;

      try {
        // Fetch event message IDs (needed for cascade deletes)
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

        // Remove attachment files from storage
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

        // Soft-delete main chat card
        if (rec.message_id) {
          await db.from('notifications').delete().eq('message_id', rec.message_id as number);
          await db.from('messages').update({
            is_deleted: true,
            content: `"${rec.name}" event has been deleted`,
            updated_at: now,
          }).eq('id', rec.message_id as number);
        }

        // Archive to event_history
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
            ended_at: now,
          });
        }

        await db.from('events').delete().eq('id', eventId);
      } catch (err) {
        console.error(`[cron/cleanup] Failed to delete dissolved event ${eventId}:`, err);
      }
    }

    // ── 2. Expire stale announcements ─────────────────────────────────────────
    await db
      .from('messages')
      .update({ is_active_announcement: false })
      .eq('is_active_announcement', true)
      .lt('announcement_expires_at', now);

    return Response.json({
      success: true,
      dissolved_events: dissolvedEvents?.length ?? 0,
      timestamp: now,
    });
  } catch (error) {
    console.error('[cron/cleanup] error:', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
