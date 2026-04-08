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
  if (!await requireAdmin(userId)) return error('Only admins can view settings', 403);

  const db = getServiceClient();
  const { data } = await db.from('app_settings').select('setting_key, setting_value');
  return json(data || []);
}
