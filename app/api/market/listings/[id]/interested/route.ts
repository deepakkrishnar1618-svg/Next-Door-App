import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { id } = await params;
  const db = getServiceClient();
  const listingId = parseInt(id);

  const { data: listing } = await db.from('market_listings').select('creator_user_id').eq('id', listingId).single();
  if (!listing) return error('Listing not found', 404);
  if (listing.creator_user_id !== userId) return error('Only the creator can view interested users', 403);

  const { data: rows } = await db
    .from('market_listing_interested')
    .select('user_id')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: true });

  const userIds = (rows || []).map((r: Record<string, unknown>) => r.user_id as string);
  if (!userIds.length) return json({ users: [] });

  const { data: users } = await db.from('users').select('id, name, avatar_url, room_number').in('id', userIds);
  const userMap: Record<string, Record<string, unknown>> = {};
  for (const u of (users || [])) {
    const rec = u as Record<string, unknown>;
    userMap[rec.id as string] = rec;
  }

  const enriched = userIds.map(uid => {
    const u = userMap[uid] || {};
    return { user_id: uid, name: u.name || null, avatar_url: u.avatar_url || null, room_number: u.room_number || null };
  });

  return json({ users: enriched });
}
