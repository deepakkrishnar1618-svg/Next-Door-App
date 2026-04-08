import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: caller } = await db.from('users').select('is_admin').eq('id', userId).single();
  if (!caller || (caller.is_admin !== 1 && caller.is_admin !== true)) return error('Only admins can view all users', 403);

  const { data: users } = await db
    .from('users')
    .select('id, name, email, room_number, avatar_url, is_admin, is_active, is_deleted, is_online, last_seen_at, profile_completed, created_at')
    .order('name', { ascending: true });

  return json({ users: users || [] });
}
