import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const { id } = await params;
  const msgId = parseInt(id);
  const db = getServiceClient();
  const groupType = request.nextUrl.searchParams.get('groupType') || 'main';
  const eventId = request.nextUrl.searchParams.get('eventId');

  if (groupType === 'event' && eventId) {
    const { data: eventMsg } = await db.from('event_messages').select('id, user_id, created_at').eq('id', msgId).single();
    if (!eventMsg) return error('Message not found', 404);

    const { data: reads } = await db.from('event_message_reads')
      .select('user_id, read_at, users!event_message_reads_user_id_fkey(name, avatar_url, room_number)')
      .eq('event_message_id', msgId);

    const readUserIds = new Set((reads || []).map((r: { user_id: string }) => r.user_id));
    const { data: members } = await db.from('event_members')
      .select('user_id, users!event_members_user_id_fkey(name, avatar_url, room_number)')
      .eq('event_id', parseInt(eventId));

    const deliveredTo = (members || [])
      .filter((m: { user_id: string }) => m.user_id !== (eventMsg as { user_id: string }).user_id && !readUserIds.has(m.user_id));

    return json({ message_id: msgId, sender_id: (eventMsg as { user_id: string }).user_id, sent_at: (eventMsg as { created_at: string }).created_at, read_by: reads || [], delivered_to: deliveredTo });
  }

  const { data: msg } = await db.from('messages').select('id, user_id, created_at').eq('id', msgId).single();
  if (!msg) return error('Message not found', 404);

  const { data: reads } = await db.from('message_reads')
    .select('user_id, read_at, users!message_reads_user_id_fkey(name, avatar_url, room_number)')
    .eq('message_id', msgId);

  const readUserIds = new Set((reads || []).map((r: { user_id: string }) => r.user_id));
  const { data: allUsers } = await db.from('users').select('id, name, avatar_url, room_number')
    .eq('is_active', 1).eq('is_deleted', false).neq('id', (msg as { user_id: string }).user_id);

  const deliveredTo = (allUsers || []).filter((u: { id: string }) => !readUserIds.has(u.id));
  return json({ message_id: msgId, sender_id: (msg as { user_id: string }).user_id, sent_at: (msg as { created_at: string }).created_at, read_by: reads || [], delivered_to: deliveredTo });
}
