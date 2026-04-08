import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: rawMessages } = await db
    .from('messages')
    .select('id, user_id, content, created_at, updated_at, is_edited, is_pinned, is_deleted, group_id, reply_to_message_id')
    .eq('is_pinned', true)
    .or('is_deleted.is.null,is_deleted.eq.false')
    .order('created_at', { ascending: false });

  if (!rawMessages?.length) return json([]);

  // Fetch user data manually (no FK constraint on messages table)
  const userIds = Array.from(new Set(rawMessages.map((m: Record<string, unknown>) => m.user_id as string)));
  const { data: users } = await db.from('users')
    .select('id, name, avatar_url, room_number')
    .in('id', userIds);

  const userMap: Record<string, Record<string, unknown>> = {};
  for (const u of (users || [])) {
    const rec = u as Record<string, unknown>;
    userMap[rec.id as string] = rec;
  }

  const messages = rawMessages.map((m: Record<string, unknown>) => {
    const u = userMap[m.user_id as string] || null;
    return {
      ...m,
      type: 'message',
      user_name: u?.name || null,
      user_avatar_url: u?.avatar_url || null,
      user_room_number: u?.room_number || null,
      reactions: [],
      attachments: [],
      reads: [],
    };
  });

  return json(messages);
}
