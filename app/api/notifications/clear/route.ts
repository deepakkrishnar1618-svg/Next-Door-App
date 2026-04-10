import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function POST() {
  return handler();
}

export async function DELETE() {
  return handler();
}

async function handler() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  // Only delete activity/mention/reply/event notifications — preserve announcement reminders
  await db.from('notifications')
    .delete()
    .eq('user_id', userId)
    .in('type', ['mention', 'activity', 'reply', 'event', 'market_listing']);

  // Reset unread message count to 0 by updating last_read_message_id to latest message
  const { data: latest } = await db.from('messages')
    .select('id')
    .or('group_id.eq.main,group_id.is.null')
    .order('id', { ascending: false })
    .limit(1)
    .single();

  if (latest) {
    await db.from('users').update({ last_read_message_id: latest.id }).eq('id', userId);
  }

  return json({ success: true });
}
