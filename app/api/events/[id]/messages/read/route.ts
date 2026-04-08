import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { id } = await params;
  const db = getServiceClient();
  const eventId = parseInt(id);

  const body = await request.json().catch(() => ({}));
  const { message_ids } = body;
  if (!Array.isArray(message_ids)) return error('message_ids must be an array', 400);

  const { data: membership } = await db.from('event_members').select('id').eq('event_id', eventId).eq('user_id', userId).maybeSingle();
  if (!membership) return error('Not a member of this event', 403);

  for (const messageId of message_ids) {
    await db.from('event_message_reads')
      .upsert({ event_message_id: messageId, user_id: userId, read_at: new Date().toISOString() }, { onConflict: 'event_message_id,user_id' });
  }

  return json({ success: true });
}
