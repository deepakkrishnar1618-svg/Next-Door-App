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

  // Must be a member
  const { data: membership } = await db.from('event_members').select('id').eq('event_id', eventId).eq('user_id', userId).maybeSingle();
  if (!membership) return error('Not a member of this event', 403);

  const { data: messages } = await db
    .from('event_messages')
    .select(`
      *,
      users!event_messages_user_id_fkey(name, avatar_url, room_number),
      reply_msg:event_messages!event_messages_reply_to_message_id_fkey(content, user_id, users!event_messages_user_id_fkey(name))
    `)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true });

  const enriched = await Promise.all((messages || []).map(async (msg: Record<string, unknown>) => {
    const u = msg.users as Record<string, unknown> | null;
    const replyMsg = msg.reply_msg as Record<string, unknown> | null;
    const replyUser = replyMsg?.users as Record<string, unknown> | null;

    const { data: attachments } = await db.from('event_message_attachments').select('*').eq('event_message_id', msg.id);
    const { data: reactions } = await db.from('event_message_reactions')
      .select('*, users!event_message_reactions_user_id_fkey(name)')
      .eq('event_message_id', msg.id);
    const { data: reads } = await db.from('event_message_reads')
      .select('*, users!event_message_reads_user_id_fkey(name, avatar_url)')
      .eq('event_message_id', msg.id);

    const content = msg.content as string | null;
    return {
      ...msg,
      users: undefined, reply_msg: undefined,
      user_name: u?.name, avatar_url: u?.avatar_url, room_number: u?.room_number,
      reply_to_content: replyMsg?.content, reply_to_user_id: replyMsg?.user_id, reply_to_user_name: replyUser?.name,
      is_join_message: content?.startsWith('joined_event:') || content?.startsWith('created_event:') || undefined,
      is_creator_join: content?.startsWith('created_event:') || undefined,
      is_leave_message: content?.startsWith('left_event:') || undefined,
      is_event_details: content?.startsWith('event_details:') || undefined,
      event_details: content?.startsWith('event_details:') ? (() => { try { return JSON.parse(content.substring('event_details:'.length)); } catch { return null; } })() : undefined,
      attachments: attachments || [],
      reactions: (reactions || []).map((r: Record<string, unknown>) => ({ ...r, user_name: (r.users as Record<string, unknown> | null)?.name, users: undefined })),
      reads: (reads || []).map((r: Record<string, unknown>) => ({ ...r, user_name: (r.users as Record<string, unknown> | null)?.name, user_avatar_url: (r.users as Record<string, unknown> | null)?.avatar_url, users: undefined })),
    };
  }));

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

  // Must be a member
  const { data: membership } = await db.from('event_members').select('id').eq('event_id', eventId).eq('user_id', userId).maybeSingle();
  if (!membership) return error('Not a member of this event', 403);

  // Event must still be active
  const { data: evt } = await db.from('events').select('id').eq('id', eventId).gt('end_datetime', new Date().toISOString()).maybeSingle();
  if (!evt) return error('Event not found or has ended', 400);

  const body = await request.json().catch(() => ({}));
  const { content, reply_to_message_id, attachments } = body;

  if (!content || typeof content !== 'string' || content.length > 5000) return error('Invalid content', 400);

  const { data: msg } = await db.from('event_messages').insert({
    event_id: eventId, user_id: userId,
    content: sanitizeHtml(content),
    reply_to_message_id: reply_to_message_id || null,
  }).select().single();

  if (attachments?.length) {
    for (const att of attachments) {
      await db.from('event_message_attachments').insert({
        event_message_id: msg.id,
        filename: att.filename, file_key: att.file_key, file_size: att.file_size, content_type: att.content_type,
      });
    }
  }

  // Clear typing status
  await db.from('typing_status').delete().eq('user_id', userId).eq('group_type', 'event').eq('group_id', String(eventId));

  // Return with user info
  const { data: u } = await db.from('users').select('name, avatar_url, room_number').eq('id', userId).single();
  const { data: msgAttachments } = await db.from('event_message_attachments').select('*').eq('event_message_id', msg.id);

  return json({
    ...msg,
    user_name: u?.name, avatar_url: u?.avatar_url, room_number: u?.room_number,
    attachments: msgAttachments || [],
    reactions: [], reads: [],
  }, 201);
}
