import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();
  const { data } = await db.from('messages')
    .select('*, users!messages_user_id_fkey(name, avatar_url, room_number)')
    .eq('is_pinned', true)
    .order('created_at', { ascending: false });
  return json(data || []);
}
