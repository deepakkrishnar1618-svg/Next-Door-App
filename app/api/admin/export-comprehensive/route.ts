import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET(_request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: caller } = await db.from('users').select('is_admin').eq('id', userId).single();
  if (!caller || (caller.is_admin !== 1 && caller.is_admin !== true)) return error('Only admins can export comprehensive data', 403);

  const [
    { data: users },
    { data: messages },
    { data: attachments },
    { data: eventHistory },
    { data: listingHistory },
    { data: transactions },
    { data: listingHelpers },
  ] = await Promise.all([
    db.from('users').select('id, name, room_number, email, avatar_url, bio, created_at, is_admin, is_online, is_active, is_deleted').eq('profile_completed', true).order('name', { ascending: true }),
    db.from('messages').select('id, user_id, content, created_at, is_edited, is_deleted').eq('group_id', 'main').eq('is_deleted', false).order('created_at', { ascending: true }),
    db.from('attachments').select('id, message_id, filename, file_key, file_size, content_type, created_at').order('created_at', { ascending: true }),
    db.from('event_history').select('id, event_id, name, description, location, start_datetime, end_datetime, max_members, creator_user_id, creator_name, creator_room, total_attendees, is_deleted, ended_at').order('start_datetime', { ascending: false }),
    db.from('market_listing_history').select('id, listing_id, title, description, type, transaction_type, is_free, price, creator_user_id, creator_name, creator_room, winner_user_id, winner_name, total_interested, is_deleted, ended_at').order('ended_at', { ascending: false }),
    db.from('market_transactions').select('*').order('closed_at', { ascending: false }),
    db.from('market_listing_history_interested').select('listing_history_id, user_id'),
  ]);

  const usersArr = users || [];
  const msgsArr = messages || [];
  const attsArr = attachments || [];
  const evtHistArr = eventHistory || [];
  const lstHistArr = listingHistory || [];
  const helpersArr = listingHelpers || [];

  // Build lookup maps
  const msgIdSet = new Map<string, Set<number>>(); // userId -> Set of message IDs
  for (const m of msgsArr) {
    const rec = m as Record<string, unknown>;
    const uid = rec.user_id as string;
    if (!msgIdSet.has(uid)) msgIdSet.set(uid, new Set());
    msgIdSet.get(uid)!.add(rec.id as number);
  }

  const attsByMsgId = new Map<number, Record<string, unknown>[]>();
  for (const a of attsArr) {
    const rec = a as Record<string, unknown>;
    const mid = rec.message_id as number;
    if (!attsByMsgId.has(mid)) attsByMsgId.set(mid, []);
    attsByMsgId.get(mid)!.push(rec);
  }

  // Build per-user grouped listing history for helpers
  const helperListingIds = new Map<string, Set<number>>(); // userId -> Set of listing_history_id
  for (const h of helpersArr) {
    const rec = h as Record<string, unknown>;
    const uid = rec.user_id as string;
    const lid = rec.listing_history_id as number;
    if (!helperListingIds.has(uid)) helperListingIds.set(uid, new Set());
    helperListingIds.get(uid)!.add(lid);
  }

  const lstHistById = new Map<number, Record<string, unknown>>();
  for (const l of lstHistArr) {
    const rec = l as Record<string, unknown>;
    lstHistById.set(rec.id as number, rec);
  }

  const exportedAt = new Date().toISOString();

  const groupedUsers = usersArr.map((u) => {
    const user = u as Record<string, unknown>;
    const uid = user.id as string;

    // Messages sent by this user in main group
    const userMsgIds = msgIdSet.get(uid) || new Set<number>();
    const userMsgs = msgsArr
      .filter((m) => (m as Record<string, unknown>).user_id === uid)
      .map((m) => {
        const rec = m as Record<string, unknown>;
        return { content: rec.content, created_at: rec.created_at, is_edited: rec.is_edited };
      });

    // Attachments for this user's messages
    const userAtts: Record<string, unknown>[] = [];
    for (const mid of Array.from(userMsgIds)) {
      const atts = attsByMsgId.get(mid) || [];
      for (const a of atts) {
        userAtts.push({
          filename: a.filename,
          file_key: a.file_key,
          file_size: a.file_size,
          content_type: a.content_type,
          created_at: a.created_at,
        });
      }
    }

    // Events created by this user (from history)
    const eventsCreated = evtHistArr
      .filter((e) => (e as Record<string, unknown>).creator_user_id === uid)
      .map((e) => {
        const rec = e as Record<string, unknown>;
        return {
          name: rec.name, description: rec.description, location: rec.location,
          start_datetime: rec.start_datetime, end_datetime: rec.end_datetime,
          total_attendees: rec.total_attendees, is_deleted: rec.is_deleted,
        };
      });

    // Requests created by this user
    const requestsCreated = lstHistArr
      .filter((l) => (l as Record<string, unknown>).creator_user_id === uid)
      .map((l) => {
        const rec = l as Record<string, unknown>;
        return {
          title: rec.title, description: rec.description, type: rec.type,
          transaction_type: rec.transaction_type, is_free: rec.is_free, price: rec.price,
          total_interested: rec.total_interested, winner_name: rec.winner_name,
          is_deleted: rec.is_deleted, ended_at: rec.ended_at,
        };
      });

    // Requests won by this user (won but didn't create)
    const requestsWon = lstHistArr
      .filter((l) => {
        const rec = l as Record<string, unknown>;
        return rec.winner_user_id === uid && rec.creator_user_id !== uid;
      })
      .map((l) => {
        const rec = l as Record<string, unknown>;
        return {
          title: rec.title, type: rec.type, transaction_type: rec.transaction_type,
          creator_name: rec.creator_name, ended_at: rec.ended_at,
        };
      });

    // Requests helped (interested but not creator or winner)
    const helpedIds = helperListingIds.get(uid) || new Set<number>();
    const requestsHelped: Record<string, unknown>[] = [];
    for (const lid of Array.from(helpedIds)) {
      const listing = lstHistById.get(lid);
      if (!listing) continue;
      if (listing.creator_user_id === uid || listing.winner_user_id === uid) continue;
      requestsHelped.push({
        title: listing.title, type: listing.type,
        creator_name: listing.creator_name, ended_at: listing.ended_at,
      });
    }

    return {
      // Top-level fields for ZIP export compatibility
      name: user.name,
      room_number: user.room_number,
      profile: {
        name: user.name,
        room_number: user.room_number,
        email: user.email,
        bio: user.bio,
        is_deleted: user.is_deleted,
        is_active: user.is_active,
        is_admin: user.is_admin,
        joined_date: user.created_at,
      },
      messages: userMsgs,
      attachments: userAtts,
      events_created: eventsCreated,
      events_attended: [], // Historical attendance data not available after event cleanup
      requests_created: requestsCreated,
      requests_won: requestsWon,
      requests_helped: requestsHelped,
    };
  });

  const activeCount = usersArr.filter((u) => {
    const rec = u as Record<string, unknown>;
    return (rec.is_active === 1 || rec.is_active === true) && !rec.is_deleted;
  }).length;

  const summary = {
    total_users: usersArr.length,
    active_users: activeCount,
    total_messages: msgsArr.length,
    total_attachments: attsArr.length,
    total_events: evtHistArr.length,
    total_requests: lstHistArr.length,
  };

  return json({
    exportedAt,
    exported_at: exportedAt,
    summary,
    users: groupedUsers,
    // Raw flat arrays for reference
    transactions: transactions || [],
  });
}
