import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

async function archiveToHistory(db: ReturnType<typeof getServiceClient>, listingId: number, isDeleted: boolean, helperUserIds?: string[], helperNames?: string[]) {
  const { data: listing } = await db
    .from('market_listings')
    .select('*, creator:users!market_listings_creator_user_id_fkey(name, room_number), winner:users!market_listings_winner_user_id_fkey(name, room_number)')
    .eq('id', listingId).single();
  if (!listing) return;

  const { count: interestCount } = await db.from('market_listing_interested').select('*', { count: 'exact', head: true }).eq('listing_id', listingId);
  const { data: mainImage } = await db.from('market_listing_images').select('image_url').eq('listing_id', listingId).order('display_order', { ascending: true }).limit(1).maybeSingle();

  const creator = listing.creator as Record<string, unknown> | null;
  const winner = listing.winner as Record<string, unknown> | null;

  const { data: existing } = await db.from('market_listing_history').select('id').eq('listing_id', listingId).maybeSingle();

  if (existing) {
    await db.from('market_listing_history').update({
      is_deleted: isDeleted,
      total_interested: interestCount || 0,
      winner_user_id: listing.winner_user_id || null,
      winner_name: winner?.name || null,
      winner_room: winner?.room_number || null,
      helper_user_ids: helperUserIds ? JSON.stringify(helperUserIds) : null,
      helper_names: helperNames ? JSON.stringify(helperNames) : null,
      ended_at: new Date().toISOString(),
    }).eq('listing_id', listingId);
  } else {
    await db.from('market_listing_history').insert({
      listing_id: listingId,
      title: listing.title,
      description: listing.description,
      type: listing.type,
      transaction_type: listing.transaction_type,
      is_free: listing.is_free,
      price: listing.price,
      image_url: mainImage?.image_url || null,
      creator_user_id: listing.creator_user_id,
      creator_name: creator?.name || 'Unknown',
      creator_room: creator?.room_number || null,
      total_interested: interestCount || 0,
      winner_user_id: listing.winner_user_id || null,
      winner_name: winner?.name || null,
      winner_room: winner?.room_number || null,
      helper_user_ids: helperUserIds ? JSON.stringify(helperUserIds) : null,
      helper_names: helperNames ? JSON.stringify(helperNames) : null,
      is_deleted: isDeleted,
      ended_at: new Date().toISOString(),
    });
  }

  // Archive interested users
  const { data: interested } = await db.from('market_listing_interested').select('user_id').eq('listing_id', listingId);
  const { data: histRecord } = await db.from('market_listing_history').select('id').eq('listing_id', listingId).single();
  if (histRecord && interested) {
    for (const i of interested) {
      await db.from('market_listing_history_interested').upsert({
        listing_history_id: histRecord.id,
        user_id: (i as { user_id: string }).user_id,
      }, { onConflict: 'listing_history_id,user_id' });
    }
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { id } = await params;
  const db = getServiceClient();
  const listingId = parseInt(id);

  const { data: listing } = await db
    .from('market_listings')
    .select('*, creator:users!market_listings_creator_user_id_fkey(name, avatar_url, room_number), winner:users!market_listings_winner_user_id_fkey(name, avatar_url)')
    .eq('id', listingId).single();
  if (!listing) return error('Listing not found', 404);

  const { data: images } = await db.from('market_listing_images').select('image_url, display_order').eq('listing_id', listingId).order('display_order', { ascending: true });
  const { data: isInterested } = await db.from('market_listing_interested').select('id').eq('listing_id', listingId).eq('user_id', userId).maybeSingle();
  const { count: interestedCount } = await db.from('market_listing_interested').select('*', { count: 'exact', head: true }).eq('listing_id', listingId);

  const creator = listing.creator as Record<string, unknown> | null;
  const winner = listing.winner as Record<string, unknown> | null;

  return json({
    listing: {
      ...listing, creator: undefined, winner: undefined,
      creator_name: creator?.name, creator_avatar: creator?.avatar_url, creator_room: creator?.room_number,
      winner_name: winner?.name, winner_avatar: winner?.avatar_url,
      interested_count: interestedCount || 0,
      is_interested: !!isInterested,
      images: images || [],
    },
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { id } = await params;
  const db = getServiceClient();
  const listingId = parseInt(id);

  const { data: listing } = await db.from('market_listings').select('creator_user_id').eq('id', listingId).single();
  if (!listing) return error('Listing not found', 404);
  if (listing.creator_user_id !== userId) return error('Only the creator can delete this listing', 403);

  await archiveToHistory(db, listingId, true);
  await db.from('market_listings').update({ is_deleted: true }).eq('id', listingId);

  return json({ success: true });
}
