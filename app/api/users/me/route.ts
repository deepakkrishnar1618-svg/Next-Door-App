import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const db = getServiceClient();
  const { data: dbUser } = await db.from('users').select('*').eq('id', userId).single();

  if (!dbUser) return error('User not found', 404);
  if (dbUser.is_active === 0) {
    if (dbUser.is_deleted) return error('Your account has been deleted', 403);
    return error('Your account has been deactivated', 403);
  }

  await db.from('users').update({ is_online: true, last_seen_at: new Date().toISOString() }).eq('id', userId);
  return json(dbUser);
}

export async function PATCH(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();
  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};
  if (body.last_read_message_id !== undefined) updates.last_read_message_id = body.last_read_message_id;
  if (Object.keys(updates).length === 0) return json({ success: true });
  await db.from('users').update(updates).eq('id', userId);
  return json({ success: true });
}
