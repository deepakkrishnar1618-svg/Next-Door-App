import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { id } = await params;
  const db = getServiceClient();
  const eventId = parseInt(id);

  // Fetch message IDs for this event that the user has read
  const { data: reads } = await db
    .from('event_message_reads')
    .select('event_message_id')
    .eq('user_id', userId);

  if (!reads?.length) return json({ last_read_message_id: null });

  const readMsgIds = reads.map((r: Record<string, unknown>) => r.event_message_id as number);

  // Filter to messages belonging to this event
  const { data: msgs } = await db
    .from('event_messages')
    .select('id')
    .eq('event_id', eventId)
    .in('id', readMsgIds);

  const lastReadId = msgs?.length
    ? Math.max(...msgs.map((m: Record<string, unknown>) => m.id as number))
    : null;

  return json({ last_read_message_id: lastReadId });
}
