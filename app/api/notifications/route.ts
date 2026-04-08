import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();
  const { data } = await db.from('notifications')
    .select('*, messages(content), users!notifications_mentioned_by_user_id_fkey(name, avatar_url)')
    .eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
  return json(data || []);
}
