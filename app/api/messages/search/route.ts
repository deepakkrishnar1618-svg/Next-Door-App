import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const q = request.nextUrl.searchParams.get('q') || '';
  if (!q.trim()) return json([]);

  const db = getServiceClient();

  // Fetch matching messages without FK join (no REFERENCES constraint on messages table)
  const { data: rawMessages } = await db
    .from('messages')
    .select('id, user_id, content, created_at')
    .ilike('content', `%${q.trim()}%`)
    .or('is_deleted.is.null,is_deleted.eq.false')
    .or('group_id.eq.main,group_id.is.null')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!rawMessages?.length) return json([]);

  // Fetch user data manually
  const userIds = [...new Set(rawMessages.map((m: Record<string, unknown>) => m.user_id as string))];
  const { data: users } = await db.from('users')
    .select('id, name, avatar_url')
    .in('id', userIds);

  const userMap: Record<string, Record<string, unknown>> = {};
  for (const u of (users || [])) {
    const rec = u as Record<string, unknown>;
    userMap[rec.id as string] = rec;
  }

  const results = rawMessages.map((m: Record<string, unknown>) => {
    const u = userMap[m.user_id as string] || null;
    return {
      id: m.id,
      user_id: m.user_id,
      content: m.content,
      created_at: m.created_at,
      user_name: (u?.name as string) || 'Unknown',
      user_avatar_url: (u?.avatar_url as string) || null,
      hashtag_name: null,
      hashtag_emoji: null,
    };
  });

  return json(results);
}
