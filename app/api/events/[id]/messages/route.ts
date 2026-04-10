import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error, sanitizeHtml } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { id } = await params;
  const db = getServiceClient();
  const eventId = parseInt(id);

  const { data: caller } = await db.from('users').select('is_active').eq('id', userId).single();
  if (!caller || caller.is_active === 0 || caller.is_active === false) return error('Your account has been deactivated', 403);

  const { data: membership } = await db.from('event_members').select('id').eq('event_id', eventId).eq('user_id', userId).maybeSingle();
  if (!membership) return error('Not a member of this event', 403);

  // Fetch messages without FK joins
  const { data: messages } = await db
    .from('event_messages')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  if (!messages?.length) return json([]);

  // Batch-fetch user data
  const userIds = Array.from(new Set(messages.map((m: Record<string, unknown>) => m.user_id as string).filter(Boolean)));
  const userMap: Record<string, Record<string, unknown>> = {};
  if (userIds.length > 0) {
    const { data: users } = await db.from('users').select('id, name, avatar_url, room_number').in('id', userIds);
    for (const u of (users || [])) {
      const rec = u as Record<string, unknown>;
      userMap[rec.id as string] = rec;
    }
  }

  // Batch-fetch reply messages
  const replyIds = Array.from(new Set(messages.map((m: Record<string, unknown>) => m.reply_to_message_id as number).filter(Boolean)));
  const replyMap: Record<number, { content: string; user_id: string }> = {};
  if (replyIds.length > 0) {
    const { data: replyMsgs } = await db.from('event_messages').select('id, content, user_id').in('id', replyIds);
    for (const r of (replyMsgs || [])) {
      const rec = r as Record<string, unknown>;
      replyMap[rec.id as number] = { content: rec.content as string, user_id: rec.user_id as string };
    }
  }

  // Batch-fetch attachments, reactions, reads
  const msgIds = messages.map((m: Record<string, unknown>) => m.id as number);
  const [{ data: allAtts }, { data: allReacts }, { data: allReads }] = await Promise.all([
    db.from('event_message_attachments').select('*').in('event_message_id', msgIds),
    db.from('event_message_reactions').select('id, event_message_id, user_id, emoji, created_at').in('event_message_id', msgIds),
    db.from('event_message_reads').select('id, event_message_id, user_id, read_at').in('event_message_id', msgIds),
  ]);

  const attMap: Record<number, unknown[]> = {};
  const reactMap: Record<number, unknown[]> = {};
  const readMap: Record<number, unknown[]> = {};
  for (const a of (allAtts || [])) {
    const rec = a as Record<string, unknown>;
    const mid = rec.event_message_id as number;
    if (!attMap[mid]) attMap[mid] = [];
    attMap[mid].push(rec);
  }
  for (const r of (allReacts || [])) {
    const rec = r as Record<string, unknown>;
    const mid = rec.event_message_id as number;
    if (!reactMap[mid]) reactMap[mid] = [];
    reactMap[mid].push({ ...rec, user_name: userMap[rec.user_id as string]?.name || null });
  }
  for (const r of (allReads || [])) {
    const rec = r as Record<string, unknown>;
    const mid = rec.event_message_id as number;
    if (!readMap[mid]) readMap[mid] = [];
    const u = userMap[rec.user_id as string] || null;
    readMap[mid].push({ ...rec, user_name: u?.name || null, user_avatar_url: u?.avatar_url || null });
  }

  const enriched = messages.map((msg: Record<string, unknown>) => {
    const u = userMap[msg.user_id as string] || null;
    const replyId = msg.reply_to_message_id as number | null;
    const reply = replyId ? replyMap[replyId] : null;
    const replyUser = reply ? (userMap[reply.user_id] || null) : null;
    const content = msg.content as string | null;
    const mid = msg.id as number;
    return {
      ...msg,
      user_name: u?.name || null,
      avatar_url: u?.avatar_url || null,
      room_number: u?.room_number || null,
      reply_to_content: reply?.content || null,
      reply_to_user_id: reply?.user_id || null,
      reply_to_user_name: replyUser?.name || null,
      is_join_message: content?.startsWith('joined_event:') || content?.startsWith('created_event:') || undefined,
      is_creator_join: content?.startsWith('created_event:') || undefined,
      is_leave_message: content?.startsWith('left_event:') || undefined,
      is_event_details: content?.startsWith('event_details:') || undefined,
      event_details: content?.startsWith('event_details:') ? (() => { try { return JSON.parse(content.substring('event_details:'.length)); } catch { return null; } })() : undefined,
      attachments: attMap[mid] || [],
      reactions: reactMap[mid] || [],
      reads: readMap[mid] || [],
    };
  });

  return json(enriched);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { id } = await params;
  const db = getServiceClient();
  const eventId = parseInt(id);

  const { data: caller } = await db.from('users').select('is_active').eq('id', userId).single();
  if (!caller || caller.is_active === 0 || caller.is_active === false) return error('Your account has been deactivated', 403);

  const { data: membership } = await db.from('event_members').select('id').eq('event_id', eventId).eq('user_id', userId).maybeSingle();
  if (!membership) return error('Not a member of this event', 403);

  const { data: evt } = await db.from('events').select('id').eq('id', eventId).gt('end_datetime', new Date().toISOString()).maybeSingle();
  if (!evt) return error('Event not found or has ended', 400);

  const body = await request.json().catch(() => ({}));
  const { content, reply_to_message_id, attachments } = body;
  if (!content || typeof content !== 'string' || content.length > 5000) return error('Invalid content', 400);

  const { data: msg, error: insertErr } = await db.from('event_messages').insert({
    event_id: eventId, user_id: userId,
    content: sanitizeHtml(content),
    reply_to_message_id: reply_to_message_id || null,
  }).select().single();

  if (insertErr || !msg) return error('Failed to send message', 500);

  if (attachments?.length) {
    for (const att of attachments) {
      await db.from('event_message_attachments').insert({
        event_message_id: msg.id,
        filename: att.filename, file_key: att.file_key, file_size: att.file_size, content_type: att.content_type,
      });
    }
  }

  await db.from('typing_status').delete().eq('user_id', userId).eq('group_type', 'event').eq('group_id', String(eventId));

  const { data: u } = await db.from('users').select('name, avatar_url, room_number').eq('id', userId).single();
  const { data: msgAttachments } = await db.from('event_message_attachments').select('*').eq('event_message_id', msg.id);

  return json({
    ...msg,
    user_name: u?.name || null,
    avatar_url: u?.avatar_url || null,
    room_number: u?.room_number || null,
    attachments: msgAttachments || [],
    reactions: [],
    reads: [],
  }, 201);
}
