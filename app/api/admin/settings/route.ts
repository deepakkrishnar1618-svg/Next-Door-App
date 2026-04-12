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
  const rows = data || [];

  // Build a keyed object for convenience
  const map: Record<string, string> = {};
  for (const row of rows) {
    const r = row as { setting_key: string; setting_value: string };
    map[r.setting_key] = r.setting_value;
  }

  let sendDays: string[] = ['monday'];
  try { sendDays = JSON.parse(map.email_send_days || '["monday"]'); } catch { /* use default */ }

  return json({
    rows,
    email_notifications_enabled: map.email_notifications_enabled === '1',
    email_send_days: sendDays,
    email_send_time: map.email_send_time || '09:00',
    email_last_sent: map.email_last_sent || '',
  });
}

export async function PATCH(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  if (!await requireAdmin(userId)) return error('Only admins can update settings', 403);

  const body = await request.json().catch(() => ({}));
  const db = getServiceClient();

  const upserts: { setting_key: string; setting_value: string }[] = [];

  if (body.email_send_days !== undefined) {
    const days = Array.isArray(body.email_send_days) ? body.email_send_days : ['monday'];
    upserts.push({ setting_key: 'email_send_days', setting_value: JSON.stringify(days) });
  }

  if (body.email_send_time !== undefined) {
    // Validate HH:MM format
    const timeStr = String(body.email_send_time);
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
      upserts.push({ setting_key: 'email_send_time', setting_value: timeStr });
    }
  }

  if (body.email_notifications_enabled !== undefined) {
    upserts.push({ setting_key: 'email_notifications_enabled', setting_value: body.email_notifications_enabled ? '1' : '0' });
  }

  for (const upsert of upserts) {
    await db.from('app_settings').upsert(upsert, { onConflict: 'setting_key' });
  }

  return json({ success: true, updated: upserts.map(u => u.setting_key) });
}
