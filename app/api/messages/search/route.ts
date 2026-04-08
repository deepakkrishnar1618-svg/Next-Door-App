import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const q = request.nextUrl.searchParams.get('q') || '';
  if (!q.trim()) return json([]);

  const db = getServiceClient();
  const { data } = await db.from('messages')
    .select('id, user_id, content, created_at, users!messages_user_id_fkey(name, avatar_url)')
    .ilike('content', `%${q}%`)
    .or('is_deleted.is.null,is_deleted.eq.false')
    .order('created_at', { ascending: false })
    .limit(50);

  return json(data || []);
}
