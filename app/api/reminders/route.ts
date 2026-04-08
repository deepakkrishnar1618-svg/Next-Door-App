import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();
  const now = new Date();

  // Inactive requests: creator's open listings with no messages in 3+ days
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: openListings } = await db
    .from('market_listings')
    .select('id, title, created_at')
    .eq('creator_user_id', userId)
    .eq('status', 'open')
    .or('is_deleted.is.null,is_deleted.eq.false')
    .or('is_completed.is.null,is_completed.eq.false');

  const inactiveRequests: Record<string, unknown>[] = [];
  for (const listing of (openListings || [])) {
    const { data: lastMsg } = await db
      .from('listing_messages')
      .select('created_at')
      .eq('listing_id', listing.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastActivity = lastMsg?.created_at || listing.created_at;
    if (new Date(lastActivity) <= new Date(threeDaysAgo)) {
      inactiveRequests.push({
        id: `request-${listing.id}`,
        type: 'inactive_request',
        title: listing.title,
        description: 'No activity for 3+ days. Consider closing or deleting this request.',
        itemId: listing.id,
        createdAt: lastActivity,
      });
    }
  }

  // Dissolving events: events ended within last 24h where user is a member
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const { data: memberships } = await db.from('event_members').select('event_id').eq('user_id', userId);
  const eventIds = (memberships || []).map((m: { event_id: number }) => m.event_id);
  const dissolvingEvents: Record<string, unknown>[] = [];

  if (eventIds.length > 0) {
    const { data: endedEvents } = await db
      .from('events')
      .select('id, name, end_datetime')
      .in('id', eventIds)
      .lt('end_datetime', now.toISOString())
      .gt('end_datetime', oneDayAgo);

    for (const evt of (endedEvents || [])) {
      const endTime = new Date(evt.end_datetime);
      const dissolveTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000);
      const hoursLeft = Math.max(0, Math.ceil((dissolveTime.getTime() - now.getTime()) / (60 * 60 * 1000)));
      dissolvingEvents.push({
        id: `event-${evt.id}`,
        type: 'dissolving_event',
        title: evt.name,
        description: `Event ended. Group will dissolve in ~${hoursLeft} hour${hoursLeft !== 1 ? 's' : ''}.`,
        itemId: evt.id,
        createdAt: evt.end_datetime,
      });
    }
  }

  const reminders = [...inactiveRequests, ...dissolvingEvents];
  return json({ reminders, count: reminders.length });
}
