import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error, sanitizeHtml } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const groupId = request.nextUrl.searchParams.get('group_id') || 'main';
  const db = getServiceClient();

  let query = db.from('messages').select(`
    id, user_id, content, created_at, updated_at, is_edited, reply_to_message_id,
    is_pinned, event_id, listing_id, is_deleted, group_id,
    users!messages_user_id_fkey (name, avatar_url, room_number, is_deleted, is_active)
  `).order('created_at', { ascending: true });

  if (groupId === 'main') {
    query = query.or('group_id.eq.main,group_id.is.null');
  } else {
    query = query.eq('group_id', groupId);
  }

  const { data: rawMessages, error: msgErr } = await query;
  if (msgErr) return json({ messages: [] });

  const messages = (rawMessages || []).map((m: Record<string, unknown>) => {
    const u = m.users as Record<string, unknown> | null;
    return {
      ...m,
      users: undefined,
      user_name: u?.name || null,
      user_avatar_url: u?.avatar_url || null,
      user_room_number: u?.room_number || null,
      user_is_deleted: u?.is_deleted || null,
      user_is_active: u?.is_active || null,
      reactions: [],
      attachments: [],
      reads: [],
    };
  });

  // Fetch reactions, attachments, reads for all messages
  const messageIds = (messages as unknown as { id: number }[]).map((m) => m.id);
  if (messageIds.length > 0) {
    const [{ data: reactions }, { data: attachments }, { data: reads }] = await Promise.all([
      db.from('reactions').select('id, message_id, user_id, emoji, created_at, users!reactions_user_id_fkey(name)').in('message_id', messageIds),
      db.from('attachments').select('*').in('message_id', messageIds),
      db.from('message_reads').select('id, message_id, user_id, read_at, users!message_reads_user_id_fkey(name, avatar_url)').in('message_id', messageIds),
    ]);

    const reactMap: Record<number, unknown[]> = {};
    const attMap: Record<number, unknown[]> = {};
    const readMap: Record<number, unknown[]> = {};

    for (const r of (reactions || [])) {
      const rec = r as Record<string, unknown>;
      if (!reactMap[rec.message_id as number]) reactMap[rec.message_id as number] = [];
      const u = rec.users as Record<string, unknown> | null;
      reactMap[rec.message_id as number].push({ ...rec, users: undefined, user_name: u?.name });
    }
    for (const a of (attachments || [])) {
      const rec = a as Record<string, unknown>;
      if (!attMap[rec.message_id as number]) attMap[rec.message_id as number] = [];
      attMap[rec.message_id as number].push(rec);
    }
    for (const r of (reads || [])) {
      const rec = r as Record<string, unknown>;
      if (!readMap[rec.message_id as number]) readMap[rec.message_id as number] = [];
      const u = rec.users as Record<string, unknown> | null;
      readMap[rec.message_id as number].push({ ...rec, users: undefined, user_name: u?.name, user_avatar_url: u?.avatar_url });
    }

    for (const m of messages) {
      const msg = m as Record<string, unknown>;
      msg.reactions = reactMap[msg.id as number] || [];
      msg.attachments = attMap[msg.id as number] || [];
      msg.reads = readMap[msg.id as number] || [];
    }
  }

  // Also fetch system messages and merge
  const { data: systemMsgs } = await db.from('system_messages').select('*').order('created_at', { ascending: true });
  const combined = [...messages, ...(systemMsgs || []).map((s: Record<string, unknown>) => ({ ...s, type: 'system' }))]
    .sort((a: Record<string, unknown>, b: Record<string, unknown>) =>
      new Date(a.created_at as string).getTime() - new Date(b.created_at as string).getTime());

  return json(combined);
}

export async function POST(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const db = getServiceClient();
  const { data: caller } = await db.from('users').select('is_active, name, room_number').eq('id', userId).single();
  // null means the column was never set on insert — treat as active. Only block when explicitly 0.
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

  // Insert attachments
  if (attachments?.length) {
    await db.from('attachments').insert(attachments.map((a: Record<string, unknown>) => ({ ...a, message_id: msg.id })));
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
