import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: rawReminders } = await db
    .from('reminders')
    .select('id, message_id, created_by_user_id, expires_at, created_at')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (!rawReminders?.length) return json({ reminders: [] });

  // Fetch messages and users manually (no FK constraints)
  const messageIds = rawReminders.map((r: Record<string, unknown>) => r.message_id as number).filter(Boolean);
  const userIds = [...new Set(rawReminders.map((r: Record<string, unknown>) => r.created_by_user_id as string).filter(Boolean))];

  const [{ data: messages }, { data: users }] = await Promise.all([
    messageIds.length > 0
      ? db.from('messages').select('id, content').in('id', messageIds)
      : Promise.resolve({ data: [] }),
    userIds.length > 0
      ? db.from('users').select('id, name').in('id', userIds)
      : Promise.resolve({ data: [] }),
  ]);

  const messageMap: Record<number, string> = {};
  for (const m of (messages || [])) {
    const rec = m as Record<string, unknown>;
    messageMap[rec.id as number] = rec.content as string;
  }
  const userMap: Record<string, string> = {};
  for (const u of (users || [])) {
    const rec = u as Record<string, unknown>;
    userMap[rec.id as string] = rec.name as string;
  }

  const reminders = rawReminders.map((r: Record<string, unknown>) => ({
    id: r.id,
    message_id: r.message_id,
    content: messageMap[r.message_id as number] || '',
    created_by_user_id: r.created_by_user_id,
    created_by_name: userMap[r.created_by_user_id as string] || 'Admin',
    expires_at: r.expires_at,
    created_at: r.created_at,
  }));

  return json({ reminders });
}

export async function POST(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: caller } = await db.from('users').select('is_admin').eq('id', userId).single();
  if (!caller || !(caller.is_admin === 1 || caller.is_admin === true)) {
    return error('Only admins can create announcements', 403);
  }

  const body = await request.json().catch(() => ({}));
  const { message_id, expires_hours = 24 } = body;
  if (!message_id) return error('message_id is required', 400);

  // Verify message exists
  const { data: msg } = await db.from('messages').select('id').eq('id', message_id).single();
  if (!msg) return error('Message not found', 404);

  const expiresAt = new Date(Date.now() + expires_hours * 60 * 60 * 1000).toISOString();

  const { data: reminder, error: insertErr } = await db.from('reminders').insert({
    message_id,
    created_by_user_id: userId,
    expires_at: expiresAt,
  }).select().single();

  if (insertErr) return error('Failed to create announcement', 500);
  return json(reminder, 201);
}
