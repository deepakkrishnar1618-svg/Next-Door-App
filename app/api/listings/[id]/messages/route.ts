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

  // Fetch messages without FK joins (no REFERENCES constraints on listing_messages)
  const { data: messages } = await db
    .from('listing_messages')
    .select('*')
    .eq('listing_id', listingId)
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

  // Batch-fetch reply messages for preview
  const replyIds = Array.from(new Set(messages.map((m: Record<string, unknown>) => m.reply_to_message_id as number).filter(Boolean)));
  const replyMap: Record<number, { content: string; user_id: string }> = {};
  if (replyIds.length > 0) {
    const { data: replyMsgs } = await db.from('listing_messages').select('id, content, user_id').in('id', replyIds);
    for (const r of (replyMsgs || [])) {
      const rec = r as Record<string, unknown>;
      replyMap[rec.id as number] = { content: rec.content as string, user_id: rec.user_id as string };
    }
  }

  // Batch-fetch attachments, reactions, reads
  const msgIds = messages.map((m: Record<string, unknown>) => m.id as number);
  const [{ data: allAttachments }, { data: allReactions }, { data: allReads }] = await Promise.all([
    db.from('listing_message_attachments').select('*').in('listing_message_id', msgIds),
    db.from('listing_message_reactions').select('id, listing_message_id, user_id, emoji, created_at').in('listing_message_id', msgIds),
    db.from('listing_message_reads').select('id, listing_message_id, user_id, read_at').in('listing_message_id', msgIds),
  ]);

  const attMap: Record<number, unknown[]> = {};
  const reactMap: Record<number, unknown[]> = {};
  const readMap: Record<number, unknown[]> = {};
  for (const a of (allAttachments || [])) {
    const rec = a as Record<string, unknown>;
    const mid = rec.listing_message_id as number;
    if (!attMap[mid]) attMap[mid] = [];
    attMap[mid].push(rec);
  }
  for (const r of (allReactions || [])) {
    const rec = r as Record<string, unknown>;
    const mid = rec.listing_message_id as number;
    if (!reactMap[mid]) reactMap[mid] = [];
    reactMap[mid].push({ ...rec, user_name: userMap[rec.user_id as string]?.name || null });
  }
  for (const r of (allReads || [])) {
    const rec = r as Record<string, unknown>;
    const mid = rec.listing_message_id as number;
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
      is_join_message: content?.startsWith('joined_listing:') || content?.startsWith('created_listing:') || undefined,
      is_creator_join: content?.startsWith('created_listing:') || undefined,
      is_leave_message: content?.startsWith('left_listing:') || undefined,
      is_listing_details: content?.startsWith('listing_details:') || undefined,
      listing_details: content?.startsWith('listing_details:') ? (() => { try { return JSON.parse(content.substring('listing_details:'.length)); } catch { return null; } })() : undefined,
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
  const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
  if ((!content || !content.trim()) && !hasAttachments) return error('Content or attachment is required', 400);
  if (content && content.length > 5000) return error('Invalid content', 400);

  const { data: msg, error: insertErr } = await db.from('listing_messages').insert({
    listing_id: listingId, user_id: userId,
    content: content ? sanitizeHtml(content) : '',
    reply_to_message_id: reply_to_message_id || null,
  }).select().single();

  if (insertErr || !msg) return error('Failed to send message', 500);

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
    user_name: u?.name || null,
    avatar_url: u?.avatar_url || null,
    room_number: u?.room_number || null,
    attachments: msgAttachments || [],
    reactions: [],
    reads: [],
  }, 201);
}
