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

  const { data: users } = await db
    .from('market_listing_interested')
    .select('user_id, users!market_listing_interested_user_id_fkey(name, avatar_url, room_number)')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: true });

  const enriched = (users || []).map((row: Record<string, unknown>) => {
    const u = row.users as Record<string, unknown> | null;
    return { user_id: row.user_id, name: u?.name, avatar_url: u?.avatar_url, room_number: u?.room_number };
  });

  return json({ users: enriched });
}
