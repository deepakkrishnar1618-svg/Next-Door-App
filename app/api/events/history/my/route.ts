import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  // Events the user attended (from attendees table)
  const { data: attended } = await db.from('event_history_attendees').select('event_history_id').eq('user_id', userId);
  const attendedHistIds = (attended || []).map((a: { event_history_id: number }) => a.event_history_id);

  // Events the user created (including deleted ones)
  const { data: created } = await db.from('event_history').select('*').eq('creator_user_id', userId);
  const createdIds = new Set((created || []).map((e: Record<string, unknown>) => e.id as number));

  // Attended events not already covered by created
  let attendedData: Record<string, unknown>[] = [];
  if (attendedHistIds.length > 0) {
    const nonCreatedAttendedIds = attendedHistIds.filter(id => !createdIds.has(id));
    if (nonCreatedAttendedIds.length > 0) {
      const { data } = await db.from('event_history').select('*').in('id', nonCreatedAttendedIds);
      attendedData = (data || []) as Record<string, unknown>[];
    }
  }

  const merged = [...(created || []), ...attendedData] as Record<string, unknown>[];
  merged.sort((a, b) => new Date(b.ended_at as string).getTime() - new Date(a.ended_at as string).getTime());

  return json(merged);
}
