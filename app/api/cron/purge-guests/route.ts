import { NextRequest } from 'next/server';
import { getServiceClient } from '@/src/lib/api-helpers';

/**
 * Purge expired guest (anonymous) accounts and the content they created.
 *
 * Guests are created by "Guest Access" (Supabase anonymous sign-in) and flagged
 * is_guest in the users table. This job removes guests older than GUEST_TTL_HOURS
 * (default 24h): their content rows, their users row, and the underlying
 * anonymous auth user (which frees Supabase MAU).
 *
 * Trigger it the same way as the other crons — POST with the x-webhook-secret
 * header — from your external scheduler (e.g. a daily/hourly hit).
 *
 * Note: user_id columns have no DB-level FK cascade, so references are cleared
 * explicitly below. Each delete is best-effort: a missing table/column is logged
 * and skipped rather than aborting the whole purge.
 */

const TTL_HOURS = Number(process.env.GUEST_TTL_HOURS || '24');

// [table, column] rows keyed to a user that should be removed with the guest.
const USER_REFERENCES: Array<[string, string]> = [
  ['reactions', 'user_id'],
  ['message_reads', 'user_id'],
  ['messages', 'user_id'],
  ['notifications', 'user_id'],
  ['notifications', 'mentioned_by_user_id'],
  ['email_notification_users', 'user_id'],
  ['event_message_reactions', 'user_id'],
  ['event_message_reads', 'user_id'],
  ['event_messages', 'user_id'],
  ['event_members', 'user_id'],
  ['events', 'creator_user_id'],
  ['typing_status', 'user_id'],
  ['listing_message_reactions', 'user_id'],
  ['listing_message_reads', 'user_id'],
  ['listing_messages', 'user_id'],
  ['market_listing_interested', 'user_id'],
  ['market_listings', 'creator_user_id'],
  ['hashtags', 'created_by'],
];

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-webhook-secret');
  if (!secret || secret !== process.env.CRON_WEBHOOK_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = getServiceClient();
    const threshold = new Date(Date.now() - TTL_HOURS * 60 * 60 * 1000).toISOString();

    const { data: expiredGuests } = await db
      .from('users')
      .select('id')
      .eq('is_guest', true)
      .lt('created_at', threshold);

    const guestIds = (expiredGuests ?? []).map((g: { id: string }) => g.id);
    if (guestIds.length === 0) {
      return Response.json({ success: true, purged: 0, ttl_hours: TTL_HOURS });
    }

    let purged = 0;
    for (const guestId of guestIds) {
      try {
        for (const [table, column] of USER_REFERENCES) {
          const { error } = await db.from(table).delete().eq(column, guestId);
          if (error) console.warn(`[purge-guests] ${table}.${column}:`, error.message);
        }

        await db.from('users').delete().eq('id', guestId);

        // Remove the anonymous auth user too (frees Supabase MAU).
        const { error: authErr } = await db.auth.admin.deleteUser(guestId);
        if (authErr) console.warn(`[purge-guests] auth delete ${guestId}:`, authErr.message);

        purged++;
      } catch (err) {
        console.error(`[purge-guests] failed for ${guestId}:`, err);
      }
    }

    return Response.json({ success: true, purged, ttl_hours: TTL_HOURS });
  } catch (error) {
    console.error('[cron/purge-guests] error:', error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
