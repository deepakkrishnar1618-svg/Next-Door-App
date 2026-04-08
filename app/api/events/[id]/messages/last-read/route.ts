import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { id } = await params;
  const db = getServiceClient();
  const eventId = parseInt(id);

  const { data: reads } = await db
    .from('event_message_reads')
    .select('event_message_id, event_messages!event_message_reads_event_message_id_fkey(event_id)')
    .eq('user_id', userId);

  const eventReads = (reads || []).filter((r: Record<string, unknown>) => {
    const msg = r.event_messages as Record<string, unknown> | null;
    return msg?.event_id === eventId;
  });

  const lastReadId = eventReads.length > 0
    ? Math.max(...eventReads.map((r: Record<string, unknown>) => r.event_message_id as number))
    : null;

  return json({ last_read_message_id: lastReadId });
}
