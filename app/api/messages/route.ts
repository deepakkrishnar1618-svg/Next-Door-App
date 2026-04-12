import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error, sanitizeHtml } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const groupId = request.nextUrl.searchParams.get('group_id') || 'main';
  const db = getServiceClient();

  // Select messages without FK join — the messages table has no REFERENCES constraint
  // so Supabase cannot resolve !messages_user_id_fkey and returns an error silently.
  // We join user data manually below.
  let query = db.from('messages').select(
    'id, user_id, content, created_at, updated_at, is_edited, reply_to_message_id, is_pinned, event_id, listing_id, is_deleted, group_id, is_active_announcement, announcement_expires_at'
  ).order('created_at', { ascending: true });

  if (groupId === 'main') {
    query = query.or('group_id.eq.main,group_id.is.null');
  } else {
    query = query.eq('group_id', groupId);
  }

  const { data: rawMessages, error: msgErr } = await query;

  if (msgErr) {
    console.error('[GET /api/messages] DB error:', msgErr.message, msgErr.details);
    return json([]);
  }

  console.log(`[GET /api/messages] group=${groupId} rows=${rawMessages?.length ?? 0}`);

  // Collect unique user IDs and fetch their profiles in one query
  const allUserIds = (rawMessages || []).map((m: Record<string, unknown>) => m.user_id as string);
  const userIds = allUserIds.filter((id, idx) => allUserIds.indexOf(id) === idx);
  const userMap: Record<string, Record<string, unknown>> = {};
  if (userIds.length > 0) {
    const { data: users } = await db.from('users')
      .select('id, name, avatar_url, room_number, is_deleted, is_active')
      .in('id', userIds);
    for (const u of (users || [])) {
      const rec = u as Record<string, unknown>;
      userMap[rec.id as string] = rec;
    }
  }

  // Batch-fetch reply_to messages for preview
  const replyIds = Array.from(new Set(
    (rawMessages || [])
      .map((m: Record<string, unknown>) => m.reply_to_message_id as number)
      .filter(Boolean)
  ));
  const replyMap: Record<number, { content: string; user_id: string }> = {};
  if (replyIds.length > 0) {
    const { data: replyMsgs } = await db.from('messages')
      .select('id, content, user_id')
      .in('id', replyIds);
    for (const r of (replyMsgs || [])) {
      const rec = r as Record<string, unknown>;
      replyMap[rec.id as number] = { content: rec.content as string, user_id: rec.user_id as string };
    }
  }

  type MsgRow = Record<string, unknown> & { id: number; user_id: string };
  const messages: MsgRow[] = (rawMessages || []).map((m: Record<string, unknown>) => {
    const u = userMap[m.user_id as string] || null;
    const replyId = m.reply_to_message_id as number | null;
    const reply = replyId ? replyMap[replyId] : null;
    const replyUser = reply ? (userMap[reply.user_id] || null) : null;
    return {
      ...m,
      id: m.id as number,
      user_id: m.user_id as string,
      type: 'message',          // MessageList filters regularMessages by type === 'message'
      user_name: u?.name || null,
      user_avatar_url: u?.avatar_url || null,
      user_room_number: u?.room_number || null,
      user_is_deleted: u?.is_deleted || null,
      user_is_active: u?.is_active || null,
      reply_to_content: reply?.content || null,
      reply_to_user_name: replyUser?.name || null,
      reactions: [] as unknown[],
      attachments: [] as unknown[],
      reads: [] as unknown[],
    };
  });

  // Fetch reactions, attachments, reads for all messages
  const messageIds = messages.map((m) => m.id);
  if (messageIds.length > 0) {
    const [{ data: reactions }, { data: attachments }, { data: reads }] = await Promise.all([
      db.from('reactions').select('id, message_id, user_id, emoji, created_at').in('message_id', messageIds),
      db.from('attachments').select('*').in('message_id', messageIds),
      db.from('message_reads').select('id, message_id, user_id, read_at').in('message_id', messageIds),
    ]);

    const reactMap: Record<number, unknown[]> = {};
    const attMap: Record<number, unknown[]> = {};
    const readMap: Record<number, unknown[]> = {};

    for (const r of (reactions || [])) {
      const rec = r as Record<string, unknown>;
      const mid = rec.message_id as number;
      if (!reactMap[mid]) reactMap[mid] = [];
      // Attach user name from our userMap
      const uname = userMap[rec.user_id as string]?.name || null;
      reactMap[mid].push({ ...rec, user_name: uname });
    }
    for (const a of (attachments || [])) {
      const rec = a as Record<string, unknown>;
      const mid = rec.message_id as number;
      if (!attMap[mid]) attMap[mid] = [];
      attMap[mid].push(rec);
    }
    for (const r of (reads || [])) {
      const rec = r as Record<string, unknown>;
      const mid = rec.message_id as number;
      if (!readMap[mid]) readMap[mid] = [];
      const u = userMap[rec.user_id as string] || null;
      readMap[mid].push({ ...rec, user_name: u?.name || null, user_avatar_url: u?.avatar_url || null });
    }

    for (const m of messages) {
      m.reactions = reactMap[m.id as number] || [];
      m.attachments = attMap[m.id as number] || [];
      m.reads = readMap[m.id as number] || [];
    }
  }

  // Batch-fetch events for messages with event_id
  const eventMsgIds = Array.from(new Set(messages.map(m => m.event_id as number).filter(Boolean)));
  const eventObjMap: Record<number, Record<string, unknown>> = {};
  if (eventMsgIds.length > 0) {
    const { data: evts } = await db.from('events').select('*').in('id', eventMsgIds);
    const evtCreatorIds = Array.from(new Set((evts || []).map((e: Record<string, unknown>) => e.creator_user_id as string)));
    const evtUserMap: Record<string, Record<string, unknown>> = {};
    if (evtCreatorIds.length > 0) {
      const { data: evtUsers } = await db.from('users').select('id, name, is_deleted, is_active').in('id', evtCreatorIds);
      for (const u of (evtUsers || [])) {
        const rec = u as Record<string, unknown>;
        evtUserMap[rec.id as string] = rec;
      }
    }
    for (const e of (evts || [])) {
      const rec = e as Record<string, unknown>;
      const u = evtUserMap[rec.creator_user_id as string] || null;
      const { count: memberCount } = await db.from('event_members').select('*', { count: 'exact', head: true }).eq('event_id', rec.id);
      const { data: memberRow } = await db.from('event_members').select('id').eq('event_id', rec.id as number).eq('user_id', userId).maybeSingle();
      eventObjMap[rec.id as number] = {
        ...rec,
        creator_name: u?.name || null,
        creator_is_deleted: u?.is_deleted ?? null,
        creator_is_active: u?.is_active ?? null,
        current_members: memberCount || 0,
        is_joined: !!memberRow,
        is_creator: rec.creator_user_id === userId,
        is_expired: new Date(rec.end_datetime as string) <= new Date(),
      };
    }
    for (const m of messages) {
      const eid = m.event_id as number | null;
      if (eid && eventObjMap[eid]) {
        (m as Record<string, unknown>).event = eventObjMap[eid];
      }
    }
  }

  // Batch-fetch listings for messages with listing_id
  const listingMsgIds = Array.from(new Set(messages.map(m => m.listing_id as number).filter(Boolean)));
  const listingObjMap: Record<number, Record<string, unknown>> = {};
  if (listingMsgIds.length > 0) {
    const { data: listings } = await db.from('market_listings').select('*').in('id', listingMsgIds);
    const listingCreatorIds = Array.from(new Set((listings || []).map((l: Record<string, unknown>) => l.creator_user_id as string)));
    const listUserMap: Record<string, Record<string, unknown>> = {};
    if (listingCreatorIds.length > 0) {
      const { data: listUsers } = await db.from('users').select('id, name, avatar_url, room_number, is_deleted, is_active').in('id', listingCreatorIds);
      for (const u of (listUsers || [])) {
        const rec = u as Record<string, unknown>;
        listUserMap[rec.id as string] = rec;
      }
    }
    // Batch-fetch interested status for current user across all listings
    const interestedSet = new Set<number>();
    if (listingMsgIds.length > 0) {
      const { data: interestRows } = await db.from('market_listing_interested').select('listing_id').eq('user_id', userId).in('listing_id', listingMsgIds);
      for (const r of (interestRows || [])) {
        interestedSet.add((r as Record<string, unknown>).listing_id as number);
      }
    }

    // Batch-fetch interested counts per listing
    const interestedCountMap: Record<number, number> = {};
    if (listingMsgIds.length > 0) {
      const { data: allInterestRows } = await db.from('market_listing_interested').select('listing_id').in('listing_id', listingMsgIds);
      for (const r of (allInterestRows || [])) {
        const lid = (r as Record<string, unknown>).listing_id as number;
        interestedCountMap[lid] = (interestedCountMap[lid] || 0) + 1;
      }
    }

    for (const l of (listings || [])) {
      const rec = l as Record<string, unknown>;
      const u = listUserMap[rec.creator_user_id as string] || null;
      const { data: images } = await db.from('market_listing_images').select('image_url, display_order').eq('listing_id', rec.id).order('display_order', { ascending: true });
      listingObjMap[rec.id as number] = {
        ...rec,
        creator_name: u?.name || null,
        creator_avatar: u?.avatar_url || null,
        creator_room: u?.room_number || null,
        creator_is_deleted: u?.is_deleted ?? null,
        creator_is_active: u?.is_active ?? null,
        images: (images || []).map((img: Record<string, unknown>) => img.image_url),
        is_creator: rec.creator_user_id === userId ? 1 : 0,
        is_interested: interestedSet.has(rec.id as number) ? 1 : 0,
        interested_count: interestedCountMap[rec.id as number] || 0,
      };
    }
    for (const m of messages) {
      const lid = m.listing_id as number | null;
      if (lid && listingObjMap[lid]) {
        (m as Record<string, unknown>).listing = listingObjMap[lid];
      }
    }
  }

  // Fetch system messages (app-wide, no group filter) and merge
  const { data: systemMsgs } = await db.from('system_messages')
    .select('*').order('created_at', { ascending: true });

  const combined = [
    ...messages,
    ...(systemMsgs || []).map((s: Record<string, unknown>) => ({ ...s, type: 'system' })),
  ].sort((a, b) =>
    new Date((a as Record<string, unknown>).created_at as string).getTime() -
    new Date((b as Record<string, unknown>).created_at as string).getTime()
  );

  // Fetch the current user's last_read_message_id so the client can compute unread position
  const { data: userRow } = await db.from('users').select('last_read_message_id').eq('id', userId).single();

  console.log(`[GET /api/messages] returning ${combined.length} total items (${messages.length} messages + ${systemMsgs?.length ?? 0} system)`);

  // Return as object so useMessages can read last_read_message_id alongside the array
  return json({ messages: combined, last_read_message_id: userRow?.last_read_message_id || null });
}

export async function POST(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const db = getServiceClient();
  const { data: caller } = await db.from('users').select('is_active, name, room_number, is_admin').eq('id', userId).single();
  // is_active null = newly created row, treat as active. Only block when explicitly 0.
  if (!caller || caller.is_active === 0) return error('Your account has been deactivated', 403);

  const isAdmin = caller.is_admin === 1 || caller.is_admin === true;

  const body = await request.json().catch(() => ({}));
  const { content, group_id = 'main', reply_to_message_id, attachments, hashtag_id } = body;

  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  if ((!content || !content.trim()) && !hasAttachments) return error('Content or attachment is required', 400);
  if (content && content.length > 5000) return error('Message too long', 400);

  const sanitized = content ? sanitizeHtml(content) : '';

  // Detect admin commands
  const hasPinCommand = isAdmin && /#pin\b/i.test(sanitized);
  const announcementMatch = isAdmin && sanitized.match(/@announcement(\d*)/i);
  const announcementHours = announcementMatch ? (parseInt(announcementMatch[1] || '24') || 24) : null;

  // Build message fields
  const msgFields: Record<string, unknown> = {
    user_id: userId,
    content: sanitized,
    group_id,
    reply_to_message_id: reply_to_message_id || null,
    hashtag_id: hashtag_id || null,
  };

  if (hasPinCommand) {
    msgFields.is_pinned = true;
  }

  if (announcementMatch && announcementHours) {
    msgFields.is_active_announcement = true;
    msgFields.announcement_expires_at = new Date(Date.now() + announcementHours * 60 * 60 * 1000).toISOString();
  }

  const { data: msg, error: insertErr } = await db.from('messages').insert(msgFields).select().single();

  if (insertErr) return error('Failed to create message', 500);

  if (attachments?.length) {
    await db.from('attachments').insert(
      attachments.map((a: Record<string, unknown>) => ({ ...a, message_id: msg.id }))
    );
  }

  // Create reminder entry for announcements
  if (announcementMatch && announcementHours && msg.id) {
    await db.from('reminders').insert({
      message_id: msg.id,
      created_by_user_id: userId,
      expires_at: msgFields.announcement_expires_at,
    });
  }

  // Parse @mentions and create notifications (skip @announcement command itself)
  const mentionMatches = sanitized.match(/@([^@\s,]+)/g) || [];
  const mentions = mentionMatches.filter((m) => !/^@announcement/i.test(m));
  if (mentions.length > 0) {
    const { data: allUsers } = await db.from('users').select('id, name').eq('is_active', 1).eq('is_deleted', false);
    for (const mention of mentions) {
      const mentionName = mention.slice(1).toLowerCase();
      const mentioned = (allUsers || []).find((u: { name: string }) => u.name?.toLowerCase() === mentionName);
      if (mentioned && (mentioned as { id: string }).id !== userId) {
        await db.from('notifications').insert({
          user_id: (mentioned as { id: string }).id,
          type: 'mention',
          message_id: msg.id,
          mentioned_by_user_id: userId,
        });
      }
    }
  }

  // Notify the original message author when someone replies to their message
  if (reply_to_message_id) {
    const { data: originalMsg } = await db.from('messages').select('user_id').eq('id', reply_to_message_id).single();
    if (originalMsg && originalMsg.user_id !== userId) {
      await db.from('notifications').insert({
        user_id: originalMsg.user_id,
        type: 'reply',
        message_id: msg.id,
        mentioned_by_user_id: userId,
      });
    }
  }

  return json(msg, 201);
}
