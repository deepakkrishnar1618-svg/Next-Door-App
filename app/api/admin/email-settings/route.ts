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
  if (!await requireAdmin(userId)) return error('Only admins can view email settings', 403);

  const db = getServiceClient();
  const { data: enabledRow } = await db.from('app_settings').select('setting_value').eq('setting_key', 'email_notifications_enabled').maybeSingle();
  const { data: timeRow } = await db.from('app_settings').select('setting_value').eq('setting_key', 'email_notification_time').maybeSingle();

  return json({
    enabled: enabledRow?.setting_value === '1',
    time: timeRow?.setting_value || '18:00',
  });
}

export async function PUT(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  if (!await requireAdmin(userId)) return error('Only admins can update email settings', 403);

  const body = await request.json().catch(() => ({}));
  const { enabled, time } = body;

  const db = getServiceClient();
  await db.from('app_settings').update({ setting_value: enabled ? '1' : '0' }).eq('setting_key', 'email_notifications_enabled');
  if (time) await db.from('app_settings').update({ setting_value: time }).eq('setting_key', 'email_notification_time');

  return json({ success: true, enabled, time });
}
