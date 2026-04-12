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
      .select('user_id, read_at').eq('event_message_id', msgId);

    const readUserIds = Array.from(new Set((reads || []).map((r: Record<string, unknown>) => r.user_id as string)));
    const allUserIds = [...readUserIds];

    const { data: members } = await db.from('event_members').select('user_id').eq('event_id', parseInt(eventId));
    const memberUserIds = (members || []).map((m: Record<string, unknown>) => m.user_id as string);
    const nonReadMemberIds = memberUserIds.filter((uid: string) => uid !== (eventMsg as Record<string, unknown>).user_id && !readUserIds.includes(uid));
    const allNeededIds = Array.from(new Set([...allUserIds, ...nonReadMemberIds]));

    const userMap: Record<string, Record<string, unknown>> = {};
    if (allNeededIds.length > 0) {
      const { data: users } = await db.from('users').select('id, name, avatar_url, room_number').in('id', allNeededIds);
      for (const u of (users || [])) {
        const rec = u as Record<string, unknown>;
        userMap[rec.id as string] = rec;
      }
    }

    const readBy = (reads || []).map((r: Record<string, unknown>) => {
      const u = userMap[r.user_id as string] || null;
      return { user_id: r.user_id, name: u?.name || null, avatar_url: u?.avatar_url || null, room_number: u?.room_number || null, read_at: r.read_at };
    });

    const deliveredTo = nonReadMemberIds.map((uid: string) => {
      const u = userMap[uid] || null;
      return { user_id: uid, name: u?.name || null, avatar_url: u?.avatar_url || null, room_number: u?.room_number || null };
    });

    return json({ message_id: msgId, sender_id: (eventMsg as Record<string, unknown>).user_id, sent_at: (eventMsg as Record<string, unknown>).created_at, read_by: readBy, delivered_to: deliveredTo });
  }

  const { data: msg } = await db.from('messages').select('id, user_id, created_at').eq('id', msgId).single();
  if (!msg) return error('Message not found', 404);

  const { data: reads } = await db.from('message_reads').select('user_id, read_at').eq('message_id', msgId);
  const readUserIds = Array.from(new Set((reads || []).map((r: Record<string, unknown>) => r.user_id as string)));

  const senderId = (msg as Record<string, unknown>).user_id as string;
  const [{ data: allUsers }, { data: readUsers }] = await Promise.all([
    db.from('users').select('id, name, avatar_url, room_number').neq('is_active', 0).neq('is_deleted', 1).neq('id', senderId),
    readUserIds.length > 0 ? db.from('users').select('id, name, avatar_url, room_number').in('id', readUserIds) : Promise.resolve({ data: [] }),
  ]);

  const userMap: Record<string, Record<string, unknown>> = {};
  for (const u of (allUsers || [])) {
    const rec = u as Record<string, unknown>;
    userMap[rec.id as string] = rec;
  }
  // Ensure read users are always in the map (even if deactivated/deleted)
  for (const u of (readUsers || [])) {
    const rec = u as Record<string, unknown>;
    if (!userMap[rec.id as string]) userMap[rec.id as string] = rec;
  }

  const readBy = (reads || []).map((r: Record<string, unknown>) => {
    const u = userMap[r.user_id as string] || null;
    return { user_id: r.user_id, name: u?.name || null, avatar_url: u?.avatar_url || null, room_number: u?.room_number || null, read_at: r.read_at };
  });

  const deliveredTo = (allUsers || [])
    .filter((u: Record<string, unknown>) => !readUserIds.includes(u.id as string))
    .map((u: Record<string, unknown>) => ({ user_id: u.id, name: u.name || null, avatar_url: u.avatar_url || null, room_number: u.room_number || null }));

  return json({ message_id: msgId, sender_id: senderId, sent_at: (msg as Record<string, unknown>).created_at, read_by: readBy, delivered_to: deliveredTo });
}
