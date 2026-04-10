import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: rawNotifs } = await db.from('notifications')
    .select('id, type, message_id, mentioned_by_user_id, is_read, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (!rawNotifs?.length) return json([]);

  // Batch-fetch message content
  const messageIds = Array.from(new Set(rawNotifs.map((n: Record<string, unknown>) => n.message_id as number).filter(Boolean)));
  const msgContentMap: Record<number, string> = {};
  if (messageIds.length > 0) {
    const { data: msgs } = await db.from('messages').select('id, content').in('id', messageIds);
    for (const m of (msgs || [])) {
      const rec = m as Record<string, unknown>;
      msgContentMap[rec.id as number] = rec.content as string;
    }
  }

  // Batch-fetch sender user data
  const senderIds = Array.from(new Set(rawNotifs.map((n: Record<string, unknown>) => n.mentioned_by_user_id as string).filter(Boolean)));
  const senderMap: Record<string, Record<string, unknown>> = {};
  if (senderIds.length > 0) {
    const { data: senders } = await db.from('users').select('id, name, avatar_url').in('id', senderIds);
    for (const s of (senders || [])) {
      const rec = s as Record<string, unknown>;
      senderMap[rec.id as string] = rec;
    }
  }

  const notifications = rawNotifs.map((n: Record<string, unknown>) => {
    const sender = senderMap[n.mentioned_by_user_id as string] || null;
    return {
      id: n.id,
      type: n.type,
      message_id: n.message_id,
      message_content: n.message_id ? (msgContentMap[n.message_id as number] || '') : '',
      mentioned_by_user_id: n.mentioned_by_user_id,
      mentioned_by_name: (sender?.name as string) || 'Unknown',
      mentioned_by_avatar: (sender?.avatar_url as string) || null,
      is_read: n.is_read,
      created_at: n.created_at,
    };
  });

  return json(notifications);
}
