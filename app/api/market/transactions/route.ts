import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();
  const { data } = await db.from('market_transactions').select('*').order('closed_at', { ascending: false }).limit(100);
  return json({ transactions: data || [] });
}
