import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error, sanitizeHtml } from '@/src/lib/api-helpers';
import { isRateLimited, getClientIp } from '@/src/lib/rate-limit';

export async function GET(request: NextRequest) {
  if (isRateLimited(getClientIp(request), 'listings:get', 60)) return error('Too many requests', 429);
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: caller } = await db.from('users').select('is_active').eq('id', userId).single();
  if (!caller || caller.is_active === 0 || caller.is_active === false) return error('Your account has been deactivated', 403);

  const filter = request.nextUrl.searchParams.get('filter') || 'new';

  let baseQuery = db
    .from('market_listings')
    .select('*')
    .or('is_deleted.is.null,is_deleted.eq.false');

  if (filter === 'my') {
    // Creator OR interested
    const { data: interested } = await db.from('market_listing_interested').select('listing_id').eq('user_id', userId);
    const interestedIds = (interested || []).map((i: { listing_id: number }) => i.listing_id);
    if (interestedIds.length > 0) {
      baseQuery = baseQuery.or(`creator_user_id.eq.${userId},id.in.(${interestedIds.join(',')})`);
    } else {
      baseQuery = baseQuery.eq('creator_user_id', userId);
    }
  } else {
    // New: active, not creator, not interested
    baseQuery = baseQuery
      .in('status', ['open', 'discussion', 'confirmed'])
      .neq('creator_user_id', userId);
  }

  const { data: listings } = await baseQuery.order('created_at', { ascending: false });

  // Batch-fetch creator user data
  const creatorIds = Array.from(new Set((listings || []).map((l: Record<string, unknown>) => l.creator_user_id as string).filter(Boolean)));
  const creatorUserMap: Record<string, Record<string, unknown>> = {};
  if (creatorIds.length > 0) {
    const { data: creatorUsers } = await db.from('users').select('id, name, avatar_url, room_number').in('id', creatorIds);
    for (const u of (creatorUsers || [])) {
      const rec = u as Record<string, unknown>;
      creatorUserMap[rec.id as string] = rec;
    }
  }

  // Batch-fetch winner user data
  const winnerIds = Array.from(new Set((listings || []).map((l: Record<string, unknown>) => l.winner_user_id as string).filter(Boolean)));
  const winnerUserMap: Record<string, Record<string, unknown>> = {};
  if (winnerIds.length > 0) {
    const { data: winnerUsers } = await db.from('users').select('id, name, avatar_url').in('id', winnerIds);
    for (const u of (winnerUsers || [])) {
      const rec = u as Record<string, unknown>;
      winnerUserMap[rec.id as string] = rec;
    }
  }

  const enriched = await Promise.all((listings || []).map(async (l: Record<string, unknown>) => {
    const u = creatorUserMap[l.creator_user_id as string] || null;
    const w = l.winner_user_id ? (winnerUserMap[l.winner_user_id as string] || null) : null;

    const { count: interestedCount } = await db.from('market_listing_interested').select('*', { count: 'exact', head: true }).eq('listing_id', l.id);
    const { data: isInterestedRow } = await db.from('market_listing_interested').select('id').eq('listing_id', l.id).eq('user_id', userId).maybeSingle();
    const { data: images } = await db.from('market_listing_images').select('image_url, display_order').eq('listing_id', l.id).order('display_order', { ascending: true });

    if (filter !== 'my' && isInterestedRow) return null; // skip if interested (new view)

    return {
      ...l,
      creator_name: u?.name ?? null, creator_avatar: u?.avatar_url ?? null, creator_room: u?.room_number ?? null,
      winner_name: w?.name ?? null, winner_avatar: w?.avatar_url ?? null,
      interested_count: interestedCount || 0,
      is_interested: !!isInterestedRow ? 1 : 0,
      is_creator: l.creator_user_id === userId ? 1 : 0,
      images: images || [],
    };
  }));

  return json({ listings: enriched.filter(Boolean), currentUserId: userId });
}

export async function POST(request: NextRequest) {
  if (isRateLimited(getClientIp(request), 'listings:post', 20)) return error('Too many requests', 429);
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: caller } = await db.from('users').select('is_active, name, room_number').eq('id', userId).single();
  if (!caller || caller.is_active === 0 || caller.is_active === false) return error('Your account has been deactivated', 403);

  // Max 5 active listings
  const { count } = await db.from('market_listings')
    .select('*', { count: 'exact', head: true })
    .eq('creator_user_id', userId)
    .in('status', ['open', 'discussion', 'confirmed'])
    .or('is_deleted.is.null,is_deleted.eq.false');
  if ((count || 0) >= 5) return error('You can only have 5 active listings at a time', 400);

  const body = await request.json().catch(() => ({}));
  const { title, description, type, transaction_type, is_free, price, rental_start_datetime, rental_end_datetime, images } = body;

  if (!title?.trim()) return error('Title is required', 400);
  if (title.length > 100) return error('Title cannot exceed 100 characters', 400);
  if (description && description.length > 1000) return error('Description cannot exceed 1000 characters', 400);

  const { data: listing } = await db.from('market_listings').insert({
    title: sanitizeHtml(title),
    description: description ? sanitizeHtml(description) : null,
    type, transaction_type, is_free: is_free ? true : false,
    price: is_free ? null : price,
    rental_start_datetime: transaction_type === 'rent' ? rental_start_datetime : null,
    rental_end_datetime: transaction_type === 'rent' ? rental_end_datetime : null,
    status: 'open', creator_user_id: userId,
  }).select().single();

  const listingId = listing.id;

  // Insert images
  for (let i = 0; i < (images || []).length; i++) {
    await db.from('market_listing_images').insert({ listing_id: listingId, image_url: images[i], display_order: i });
  }

  // Post card in main chat - include listing_id so MessageBubble renders it as a card
  const cardText = `🤝 New request: "${sanitizeHtml(title)}"`;
  let messageId: number | null = null;
  try {
    const { data: msg } = await db.from('messages').insert({
      user_id: userId,
      content: cardText,
      group_id: 'main',
      listing_id: listingId,
    }).select('id').single();
    messageId = msg?.id || null;
  } catch { /* ignore */ }

  if (messageId) {
    await db.from('market_listings').update({ message_id: messageId }).eq('id', listingId);
  }

  // Notify all active users (activity type)
  const { data: allUsers } = await db.from('users').select('id').eq('is_active', true).eq('is_deleted', false).neq('id', userId);
  for (const u of (allUsers || [])) {
    await db.from('notifications').insert({
      user_id: (u as { id: string }).id,
      type: 'activity',
      message_id: messageId,
      mentioned_by_user_id: userId,
    });
  }

  // Creator join message in listing chat
  await db.from('listing_messages').insert({
    listing_id: listingId, user_id: userId,
    content: `created_listing:${caller.name}:${caller.room_number || ''}`,
  });

  return json({ success: true, listing_id: listingId, message_id: messageId }, 201);
}
