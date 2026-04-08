import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const db = getServiceClient();
  const { data: callerUser } = await db.from('users').select('is_admin').eq('id', userId).single();
  const isAdmin = callerUser?.is_admin === true || callerUser?.is_admin === 1;

  const { data: users } = await db
    .from('users')
    .select('id, email, name, room_number, avatar_url, is_admin, is_online, last_seen_at, profile_completed, is_active, is_deleted')
    .order('is_online', { ascending: false })
    .order('name', { ascending: true });

  const filtered = (users || []).map((u: Record<string, unknown>) => {
    const sanitized = {
      id: u.id, name: u.name, room_number: u.room_number, avatar_url: u.avatar_url,
      is_admin: u.is_admin, is_online: u.is_online, last_seen_at: u.last_seen_at,
      profile_completed: u.profile_completed, is_active: u.is_active, is_deleted: u.is_deleted,
    } as Record<string, unknown>;
    if (isAdmin || u.id === userId) sanitized.email = u.email;
    return sanitized;
  });

  return json(filtered);
}
