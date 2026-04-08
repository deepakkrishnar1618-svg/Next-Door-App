import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  // Creator
  const { data: creatorUser } = await db.from('users').select('id, name, avatar_url, room_number, is_online, last_seen_at').eq('id', listing.creator_user_id).single();
  const now = new Date();

  const members: Record<string, unknown>[] = [];
  if (creatorUser) {
    const lastSeen = creatorUser.last_seen_at ? new Date(creatorUser.last_seen_at) : null;
    members.push({
      ...creatorUser,
      is_online: creatorUser.is_online && lastSeen && (now.getTime() - lastSeen.getTime()) < 2 * 60 * 1000 ? 1 : 0,
      is_creator: true,
    });
  }

  // Interested users
  const { data: interested } = await db
    .from('market_listing_interested')
    .select('user_id, users!market_listing_interested_user_id_fkey(id, name, avatar_url, room_number, is_online, last_seen_at)')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: true });

  for (const row of (interested || [])) {
    const u = (row as Record<string, unknown>).users as Record<string, unknown> | null;
    if (!u) continue;
    const lastSeen = u.last_seen_at ? new Date(u.last_seen_at as string) : null;
    members.push({
      ...u,
      is_online: u.is_online && lastSeen && (now.getTime() - lastSeen.getTime()) < 2 * 60 * 1000 ? 1 : 0,
      is_creator: false,
    });
  }

  return json({ members });
}
