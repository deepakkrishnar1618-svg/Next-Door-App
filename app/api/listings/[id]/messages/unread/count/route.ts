import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { id } = await params;
  const db = getServiceClient();
  const listingId = parseInt(id);

  const { data: listing } = await db.from('market_listings').select('creator_user_id').eq('id', listingId).maybeSingle();
  const isCreator = listing?.creator_user_id === userId;
  if (!isCreator) {
    const { data: isInterested } = await db.from('market_listing_interested').select('id').eq('listing_id', listingId).eq('user_id', userId).maybeSingle();
    if (!isInterested) return json({ count: 0 });
  }

  const { data: allMsgIds } = await db.from('listing_messages').select('id').eq('listing_id', listingId).neq('user_id', userId);
  const { data: readIds } = await db.from('listing_message_reads').select('listing_message_id').eq('user_id', userId);

  const readSet = new Set((readIds || []).map((r: { listing_message_id: number }) => r.listing_message_id));
  const count = (allMsgIds || []).filter((m: { id: number }) => !readSet.has(m.id)).length;

  return json({ count });
}
