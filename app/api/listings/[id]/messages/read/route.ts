import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { id } = await params;
  const db = getServiceClient();

  const body = await request.json().catch(() => ({}));
  const { message_ids } = body;
  if (!Array.isArray(message_ids)) return error('message_ids must be an array', 400);

  for (const messageId of message_ids) {
    await db.from('listing_message_reads')
      .upsert({ listing_message_id: messageId, user_id: userId, read_at: new Date().toISOString() }, { onConflict: 'listing_message_id,user_id' });
  }

  return json({ success: true });
}
