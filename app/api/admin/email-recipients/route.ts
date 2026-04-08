import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

async function requireAdmin(userId: string) {
  const db = getServiceClient();
  const { data } = await db.from('users').select('is_admin').eq('id', userId).single();
  return data?.is_admin === 1 || data?.is_admin === true;
}

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  if (!await requireAdmin(userId)) return error('Only admins can view email recipients', 403);

  const db = getServiceClient();
  const { data } = await db.from('email_notification_users').select('user_id');
  return json({ user_ids: (data || []).map((u: { user_id: string }) => u.user_id) });
}

export async function PUT(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  if (!await requireAdmin(userId)) return error('Only admins can update email recipients', 403);

  const body = await request.json().catch(() => ({}));
  const { user_ids } = body;
  if (!Array.isArray(user_ids)) return error('user_ids must be an array', 400);

  const db = getServiceClient();
  await db.from('email_notification_users').delete().neq('user_id', '');
  for (const uid of user_ids) {
    await db.from('email_notification_users').insert({ user_id: uid });
  }

  return json({ success: true, count: user_ids.length });
}
