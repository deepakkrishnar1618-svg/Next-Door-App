import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data } = await db
    .from('reminders')
    .select(`
      id, message_id, created_by_user_id, expires_at, created_at,
      messages!reminders_message_id_fkey(content),
      users!reminders_created_by_user_id_fkey(name)
    `)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  const reminders = (data || []).map((r: Record<string, unknown>) => ({
    id: r.id,
    message_id: r.message_id,
    content: (r.messages as Record<string, unknown> | null)?.content,
    created_by_user_id: r.created_by_user_id,
    created_by_name: (r.users as Record<string, unknown> | null)?.name,
    expires_at: r.expires_at,
    created_at: r.created_at,
  }));

  return json({ reminders });
}
