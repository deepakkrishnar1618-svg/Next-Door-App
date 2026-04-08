import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();
  const { data } = await db.from('event_history').select('*').order('ended_at', { ascending: false });
  return json(data || []);
}
