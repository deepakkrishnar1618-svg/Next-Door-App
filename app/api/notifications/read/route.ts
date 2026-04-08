import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function POST(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();
  const body = await request.json().catch(() => ({}));
  const ids: number[] = body.notification_ids || [];
  if (ids.length === 0) {
    await db.from('notifications').update({ is_read: true }).eq('user_id', userId);
  } else {
    for (const id of ids) {
      await db.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', userId);
    }
  }
  return json({ success: true });
}
