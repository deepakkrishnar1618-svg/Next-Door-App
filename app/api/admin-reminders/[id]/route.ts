import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { id } = await params;
  const db = getServiceClient();

  const { data: caller } = await db.from('users').select('is_admin').eq('id', userId).single();
  if (!caller || !(caller.is_admin === 1 || caller.is_admin === true)) return error('Only admins can delete reminders', 403);

  await db.from('reminders').delete().eq('id', id);
  return json({ success: true });
}
