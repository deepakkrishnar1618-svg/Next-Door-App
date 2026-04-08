import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET() {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: user } = await db.from('users').select('last_read_message_id').eq('id', userId).single();
  const lastReadId = user?.last_read_message_id || 0;

  const { count } = await db.from('messages')
    .select('*', { count: 'exact', head: true })
    .gt('id', lastReadId)
    .neq('user_id', userId)
    .or('is_deleted.is.null,is_deleted.eq.false')
    .or('group_id.eq.main,group_id.is.null');

  return json({ count: count || 0 });
}
