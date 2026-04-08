import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function POST(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const body = await request.json().catch(() => ({}));
  const messageIds: number[] = body.message_ids || [];
  if (!messageIds.length) return json({ success: true });

  const db = getServiceClient();
  const now = new Date().toISOString();
  const inserts = messageIds.map(id => ({ message_id: id, user_id: userId, read_at: now }));
  await db.from('message_reads').upsert(inserts, { onConflict: 'message_id,user_id' });

  // Update last_read_message_id
  const maxId = Math.max(...messageIds);
  await db.from('users').update({ last_read_message_id: maxId }).eq('id', userId);
  return json({ success: true });
}
