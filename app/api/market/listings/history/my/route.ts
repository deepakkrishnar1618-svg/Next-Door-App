import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: interestedHistory } = await db.from('market_listing_history_interested').select('listing_history_id').eq('user_id', userId);
  const interestedIds = (interestedHistory || []).map((i: { listing_history_id: number }) => i.listing_history_id);

  const { data: creatorHistory } = await db.from('market_listing_history').select('id').eq('creator_user_id', userId);
  const creatorIds = (creatorHistory || []).map((h: { id: number }) => h.id);

  const combined = [...interestedIds, ...creatorIds];
  const allIds = combined.filter((id, index) => combined.indexOf(id) === index);
  if (!allIds.length) return json([]);

  const { data } = await db.from('market_listing_history').select('*').in('id', allIds).order('ended_at', { ascending: false });
  return json(data || []);
}
