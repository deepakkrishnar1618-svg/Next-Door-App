import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function POST() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();
  await db.from('notifications').delete().eq('user_id', userId);
  return json({ success: true });
}
