import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error, sanitizeHtml } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { id } = await params;
  const db = getServiceClient();
  const listingId = parseInt(id);

  const { data: caller } = await db.from('users').select('is_active').eq('id', userId).single();
  if (!caller || caller.is_active === 0 || caller.is_active === false) return error('Your account has been deactivated', 403);

  const { data: listing } = await db.from('market_listings').select('creator_user_id').eq('id', listingId).maybeSingle();
  if (!listing) return error('Listing not found', 404);

  const isCreator = listing.creator_user_id === userId;
  if (!isCreator) {
    const { data: isInterested } = await db.from('market_listing_interested').select('id').eq('listing_id', listingId).eq('user_id', userId).maybeSingle();
    if (!isInterested) return error('Not authorized to view this listing\'s messages', 403);
  }

  const { data: messages } = await db
    .from('listing_messages')
    .select(`
      *,
      users!listing_messages_user_id_fkey(name, avatar_url, room_number),
      reply_msg:listing_messages!listing_messages_reply_to_message_id_fkey(content, user_id, users!listing_messages_user_id_fkey(name))
    `)
    .eq('listing_id', listingId)
    .order('created_at', { ascending: true });

  const enriched = await Promise.all((messages || []).map(async (msg: Record<string, unknown>) => {
    const u = msg.users as Record<string, unknown> | null;
    const replyMsg = msg.reply_msg as Record<string, unknown> | null;
    const replyUser = replyMsg?.users as Record<string, unknown> | null;

    const { data: attachments } = await db.from('listing_message_attachments').select('*').eq('listing_message_id', msg.id);
    const { data: reactions } = await db.from('listing_message_reactions')
      .select('*, users!listing_message_reactions_user_id_fkey(name)')
      .eq('listing_message_id', msg.id);
    const { data: reads } = await db.from('listing_message_reads')
      .select('*, users!listing_message_reads_user_id_fkey(name, avatar_url)')
      .eq('listing_message_id', msg.id);

    const content = msg.content as string | null;
    return {
      ...msg, users: undefined, reply_msg: undefined,
      user_name: u?.name, avatar_url: u?.avatar_url, room_number: u?.room_number,
      reply_to_content: replyMsg?.content, reply_to_user_id: replyMsg?.user_id, reply_to_user_name: replyUser?.name,
      is_join_message: content?.startsWith('joined_listing:') || content?.startsWith('created_listing:') || undefined,
      is_creator_join: content?.startsWith('created_listing:') || undefined,
      is_leave_message: content?.startsWith('left_listing:') || undefined,
      is_listing_details: content?.startsWith('listing_details:') || undefined,
      listing_details: content?.startsWith('listing_details:') ? (() => { try { return JSON.parse(content.substring('listing_details:'.length)); } catch { return null; } })() : undefined,
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
  const listingId = parseInt(id);

  const { data: caller } = await db.from('users').select('is_active').eq('id', userId).single();
  if (!caller || caller.is_active === 0 || caller.is_active === false) return error('Your account has been deactivated', 403);

  const { data: listing } = await db.from('market_listings').select('creator_user_id').eq('id', listingId).maybeSingle();
  if (!listing) return error('Listing not found', 404);

  const isCreator = listing.creator_user_id === userId;
  if (!isCreator) {
    const { data: isInterested } = await db.from('market_listing_interested').select('id').eq('listing_id', listingId).eq('user_id', userId).maybeSingle();
    if (!isInterested) return error('Not a member of this listing chat', 403);
  }

  const body = await request.json().catch(() => ({}));
  const { content, reply_to_message_id, attachments } = body;
  if (!content || typeof content !== 'string' || content.length > 5000) return error('Invalid content', 400);

  const { data: msg } = await db.from('listing_messages').insert({
    listing_id: listingId, user_id: userId,
    content: sanitizeHtml(content),
    reply_to_message_id: reply_to_message_id || null,
  }).select().single();

  if (attachments?.length) {
    for (const att of attachments) {
      await db.from('listing_message_attachments').insert({
        listing_message_id: msg.id,
        filename: att.filename, file_key: att.file_key, file_size: att.file_size, content_type: att.content_type,
      });
    }
  }

  await db.from('typing_status').delete().eq('user_id', userId).eq('group_type', 'listing').eq('group_id', String(listingId));

  const { data: u } = await db.from('users').select('name, avatar_url, room_number').eq('id', userId).single();
  const { data: msgAttachments } = await db.from('listing_message_attachments').select('*').eq('listing_message_id', msg.id);

  return json({
    ...msg,
    user_name: u?.name, avatar_url: u?.avatar_url, room_number: u?.room_number,
    attachments: msgAttachments || [], reactions: [], reads: [],
  }, 201);
}
