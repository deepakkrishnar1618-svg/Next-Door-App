import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();
  const { data } = await db.from('market_transactions')
    .select('*')
    .or(`creator_user_id.eq.${userId},winner_user_id.eq.${userId}`)
    .order('closed_at', { ascending: false });
  return json({ transactions: data || [] });
}
