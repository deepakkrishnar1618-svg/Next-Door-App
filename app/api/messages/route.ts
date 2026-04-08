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
    'id, user_id, content, created_at, updated_at, is_edited, reply_to_message_id, is_pinned, event_id, listing_id, is_deleted, group_id'
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

  type MsgRow = Record<string, unknown> & { id: number; user_id: string };
  const messages: MsgRow[] = (rawMessages || []).map((m: Record<string, unknown>) => {
    const u = userMap[m.user_id as string] || null;
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
  const { data: caller } = await db.from('users').select('is_active, name, room_number').eq('id', userId).single();
  // is_active null = newly created row, treat as active. Only block when explicitly 0.
  if (!caller || caller.is_active === 0) return error('Your account has been deactivated', 403);

  const body = await request.json().catch(() => ({}));
  const { content, group_id = 'main', reply_to_message_id, attachments, hashtag_id } = body;

  if (!content || !content.trim()) return error('Content is required', 400);
  if (content.length > 5000) return error('Message too long', 400);

  const sanitized = sanitizeHtml(content);

  const { data: msg, error: insertErr } = await db.from('messages').insert({
    user_id: userId,
    content: sanitized,
    group_id,
    reply_to_message_id: reply_to_message_id || null,
    hashtag_id: hashtag_id || null,
  }).select().single();

  if (insertErr) return error('Failed to create message', 500);

  if (attachments?.length) {
    await db.from('attachments').insert(
      attachments.map((a: Record<string, unknown>) => ({ ...a, message_id: msg.id }))
    );
  }

  // Parse @mentions and create notifications
  const mentions = sanitized.match(/@([^@\s,]+)/g) || [];
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

  return json(msg, 201);
}
