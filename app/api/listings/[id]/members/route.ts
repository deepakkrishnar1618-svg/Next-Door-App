import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { id } = await params;
  const db = getServiceClient();
  const listingId = parseInt(id);

  const { data: listing } = await db.from('market_listings').select('creator_user_id').eq('id', listingId).maybeSingle();
  if (!listing) return error('Listing not found', 404);

  const isCreator = listing.creator_user_id === userId;
  if (!isCreator) {
    const { data: isInterested } = await db.from('market_listing_interested').select('id').eq('listing_id', listingId).eq('user_id', userId).maybeSingle();
    if (!isInterested) return error('Not authorized', 403);
  }

  const now = new Date();
  const members: Record<string, unknown>[] = [];

  // Creator
  const { data: creatorUser } = await db.from('users').select('id, name, avatar_url, room_number, is_online, last_seen_at, is_deleted, is_active, is_admin').eq('id', listing.creator_user_id).single();
  if (creatorUser) {
    const rec = creatorUser as Record<string, unknown>;
    const lastSeen = rec.last_seen_at ? new Date(rec.last_seen_at as string) : null;
    members.push({
      ...rec,
      user_id: rec.id,
      is_online: rec.is_online && lastSeen && (now.getTime() - lastSeen.getTime()) < 2 * 60 * 1000 ? 1 : 0,
      is_creator: true,
    });
  }

  // Interested users — batch-fetch instead of FK join
  const { data: interestedRows } = await db
    .from('market_listing_interested')
    .select('user_id')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: true });

  const interestedUserIds = (interestedRows || []).map((r: Record<string, unknown>) => r.user_id as string);
  if (interestedUserIds.length > 0) {
    const { data: interestedUsers } = await db.from('users').select('id, name, avatar_url, room_number, is_online, last_seen_at, is_deleted, is_active, is_admin').in('id', interestedUserIds);
    const interestedUserMap: Record<string, Record<string, unknown>> = {};
    for (const u of (interestedUsers || [])) {
      const rec = u as Record<string, unknown>;
      interestedUserMap[rec.id as string] = rec;
    }
    for (const uid of interestedUserIds) {
      const u = interestedUserMap[uid];
      if (!u) continue;
      const lastSeen = u.last_seen_at ? new Date(u.last_seen_at as string) : null;
      members.push({
        ...u,
        user_id: u.id,
        is_online: u.is_online && lastSeen && (now.getTime() - lastSeen.getTime()) < 2 * 60 * 1000 ? 1 : 0,
        is_creator: false,
      });
    }
  }

  return json({ members });
}
