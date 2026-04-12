import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

async function archiveToHistory(db: ReturnType<typeof getServiceClient>, listingId: number, isDeleted: boolean, helperUserIds?: string[], helperNames?: string[]) {
  const { data: listing } = await db.from('market_listings').select('*').eq('id', listingId).single();
  if (!listing) return;

  const { data: creatorUser } = await db.from('users').select('name, room_number').eq('id', listing.creator_user_id).maybeSingle();
  const winnerUser = listing.winner_user_id
    ? (await db.from('users').select('name, room_number').eq('id', listing.winner_user_id).maybeSingle()).data
    : null;

  const { count: interestCount } = await db.from('market_listing_interested').select('*', { count: 'exact', head: true }).eq('listing_id', listingId);
  const { data: mainImage } = await db.from('market_listing_images').select('image_url').eq('listing_id', listingId).order('display_order', { ascending: true }).limit(1).maybeSingle();

  const { data: existing } = await db.from('market_listing_history').select('id').eq('listing_id', listingId).maybeSingle();

  if (existing) {
    await db.from('market_listing_history').update({
      is_deleted: isDeleted,
      total_interested: interestCount || 0,
      winner_user_id: listing.winner_user_id || null,
      winner_name: winnerUser?.name || null,
      winner_room: winnerUser?.room_number || null,
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
      creator_name: creatorUser?.name || 'Unknown',
      creator_room: creatorUser?.room_number || null,
      total_interested: interestCount || 0,
      winner_user_id: listing.winner_user_id || null,
      winner_name: winnerUser?.name || null,
      winner_room: winnerUser?.room_number || null,
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

  const { data: listing } = await db.from('market_listings').select('*').eq('id', listingId).single();
  if (!listing) return error('Listing not found', 404);

  const { data: creatorUser } = await db.from('users').select('name, avatar_url, room_number').eq('id', listing.creator_user_id).maybeSingle();
  const winnerUser = listing.winner_user_id
    ? (await db.from('users').select('name, avatar_url').eq('id', listing.winner_user_id).maybeSingle()).data
    : null;

  const { data: images } = await db.from('market_listing_images').select('image_url, display_order').eq('listing_id', listingId).order('display_order', { ascending: true });
  const { data: isInterested } = await db.from('market_listing_interested').select('id').eq('listing_id', listingId).eq('user_id', userId).maybeSingle();
  const { count: interestedCount } = await db.from('market_listing_interested').select('*', { count: 'exact', head: true }).eq('listing_id', listingId);

  return json({
    listing: {
      ...listing,
      creator_name: creatorUser?.name ?? null,
      creator_avatar: creatorUser?.avatar_url ?? null,
      creator_room: creatorUser?.room_number ?? null,
      winner_name: winnerUser?.name ?? null,
      winner_avatar: (winnerUser as Record<string, unknown> | null)?.avatar_url ?? null,
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

  const { data: listing } = await db.from('market_listings').select('*').eq('id', listingId).single();
  if (!listing) return error('Listing not found', 404);

  const { data: caller } = await db.from('users').select('is_admin').eq('id', userId).single();
  const isAdmin = caller?.is_admin === 1 || caller?.is_admin === true;
  if (listing.creator_user_id !== userId && !isAdmin) return error('Only the creator can delete this listing', 403);

  // 1. Fetch listing message IDs + attachment file_keys
  const { data: listingMsgs } = await db.from('listing_messages').select('id').eq('listing_id', listingId);
  const msgIds = (listingMsgs || []).map((m: Record<string, unknown>) => m.id as number);

  if (msgIds.length > 0) {
    // Fetch attachment file_keys before deleting
    const { data: msgAtts } = await db.from('listing_message_attachments').select('file_key').in('listing_message_id', msgIds);
    const attFileKeys: string[] = (msgAtts || []).map((a: Record<string, unknown>) => a.file_key as string).filter(Boolean);
    if (attFileKeys.length > 0) {
      const byBucket: Record<string, string[]> = {};
      for (const fk of attFileKeys) {
        const parts = fk.split('/');
        const bucket = parts[0];
        const path = parts.slice(1).join('/');
        if (!byBucket[bucket]) byBucket[bucket] = [];
        byBucket[bucket].push(path);
      }
      for (const [bucket, paths] of Object.entries(byBucket)) {
        await db.storage.from(bucket).remove(paths);
      }
    }

    // 2. Delete reads, reactions, attachments for messages
    await db.from('listing_message_reads').delete().in('listing_message_id', msgIds);
    await db.from('listing_message_reactions').delete().in('listing_message_id', msgIds);
    await db.from('listing_message_attachments').delete().in('listing_message_id', msgIds);
  }

  // 3. Delete listing messages
  await db.from('listing_messages').delete().eq('listing_id', listingId);

  // 4. Delete typing status
  await db.from('typing_status').delete().eq('group_type', 'listing').eq('group_id', String(listingId));

  // 5. Delete interested rows
  await db.from('market_listing_interested').delete().eq('listing_id', listingId);

  // 6. Delete listing images from storage + table
  const { data: images } = await db.from('market_listing_images').select('image_url').eq('listing_id', listingId);
  const imgKeys: string[] = (images || []).map((img: Record<string, unknown>) => {
    const url = img.image_url as string;
    // image_url may be a full URL; extract path after bucket name
    const match = url?.match(/\/storage\/v1\/object\/public\/([^?]+)/);
    return match ? match[1] : null;
  }).filter(Boolean) as string[];
  if (imgKeys.length > 0) {
    const byBucket: Record<string, string[]> = {};
    for (const fk of imgKeys) {
      const parts = fk.split('/');
      const bucket = parts[0];
      const path = parts.slice(1).join('/');
      if (!byBucket[bucket]) byBucket[bucket] = [];
      byBucket[bucket].push(path);
    }
    for (const [bucket, paths] of Object.entries(byBucket)) {
      await db.storage.from(bucket).remove(paths);
    }
  }
  await db.from('market_listing_images').delete().eq('listing_id', listingId);

  // 7. Soft-delete main chat card and delete linked notifications
  if (listing.message_id) {
    await db.from('notifications').delete().eq('message_id', listing.message_id);
    await db.from('messages').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', listing.message_id);
  }

  // 8. Archive to history, then delete
  await archiveToHistory(db, listingId, true);
  await db.from('market_listings').delete().eq('id', listingId);

  return json({ success: true });
}
