import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error, sanitizeHtml } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: caller } = await db.from('users').select('is_active').eq('id', userId).single();
  if (!caller || caller.is_active === 0 || caller.is_active === false) return error('Your account has been deactivated', 403);

  const filter = request.nextUrl.searchParams.get('filter') || 'new';

  let query = db
    .from('market_listings')
    .select(`
      *,
      users!market_listings_creator_user_id_fkey(name, avatar_url, room_number),
      winner:users!market_listings_winner_user_id_fkey(name, avatar_url)
    `)
    .is('is_deleted', null).or('is_deleted.eq.false,is_deleted.eq.0');

  if (filter === 'my') {
    // Creator OR interested
    const { data: interested } = await db.from('market_listing_interested').select('listing_id').eq('user_id', userId);
    const interestedIds = (interested || []).map((i: { listing_id: number }) => i.listing_id);
    if (interestedIds.length > 0) {
      query = query.or(`creator_user_id.eq.${userId},id.in.(${interestedIds.join(',')})`);
    } else {
      query = query.eq('creator_user_id', userId);
    }
  } else {
    // New: active, not creator, not interested
    query = query
      .in('status', ['open', 'discussion', 'confirmed'])
      .neq('creator_user_id', userId);
  }

  const { data: listings } = await query.order('created_at', { ascending: false });

  const enriched = await Promise.all((listings || []).map(async (l: Record<string, unknown>) => {
    const u = l.users as Record<string, unknown> | null;
    const w = l.winner as Record<string, unknown> | null;

    const { count: interestedCount } = await db.from('market_listing_interested').select('*', { count: 'exact', head: true }).eq('listing_id', l.id);
    const { data: isInterestedRow } = await db.from('market_listing_interested').select('id').eq('listing_id', l.id).eq('user_id', userId).maybeSingle();
    const { data: images } = await db.from('market_listing_images').select('image_url, display_order').eq('listing_id', l.id).order('display_order', { ascending: true });

    if (filter !== 'my' && isInterestedRow) return null; // skip if interested (new view)

    return {
      ...l, users: undefined, winner: undefined,
      creator_name: u?.name, creator_avatar: u?.avatar_url, creator_room: u?.room_number,
      winner_name: w?.name, winner_avatar: w?.avatar_url,
      interested_count: interestedCount || 0,
      is_interested: !!isInterestedRow ? 1 : 0,
      is_creator: l.creator_user_id === userId ? 1 : 0,
      images: images || [],
    };
  }));

  return json({ listings: enriched.filter(Boolean), currentUserId: userId });
}

export async function POST(request: NextRequest) {
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

  // Post card in main chat — include listing_id so MessageBubble renders it as a card
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
