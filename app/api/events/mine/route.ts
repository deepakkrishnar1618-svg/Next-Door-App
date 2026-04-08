import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: memberships } = await db.from('event_members').select('event_id').eq('user_id', userId);
  const eventIds = (memberships || []).map((m: { event_id: number }) => m.event_id);
  if (!eventIds.length) return json({ events: [] });

  const { data: events } = await db.from('events')
    .select('*, users!events_creator_user_id_fkey(name, is_deleted, is_active)')
    .in('id', eventIds).order('start_datetime', { ascending: true });

  const now = new Date();
  const enriched = await Promise.all((events || []).map(async (evt: Record<string, unknown>) => {
    const { count } = await db.from('event_members').select('*', { count: 'exact', head: true }).eq('event_id', evt.id);
    const u = evt.users as Record<string, unknown> | null;
    const endTime = new Date(evt.end_datetime as string).getTime();
    return {
      ...evt, users: undefined,
      creator_name: u?.name, creator_is_deleted: u?.is_deleted, creator_is_active: u?.is_active,
      current_members: count || 0,
      is_joined: true, is_creator: evt.creator_user_id === userId,
      is_expired: now.getTime() > endTime,
    };
  }));

  return json({ events: enriched });
}
