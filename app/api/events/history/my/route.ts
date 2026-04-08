import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: attended } = await db.from('event_history_attendees').select('event_history_id').eq('user_id', userId);
  const histIds = (attended || []).map((a: { event_history_id: number }) => a.event_history_id);
  if (!histIds.length) return json([]);

  const { data } = await db.from('event_history').select('*').in('id', histIds).order('ended_at', { ascending: false });
  return json(data || []);
}
