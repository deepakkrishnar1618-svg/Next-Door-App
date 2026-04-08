import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ groupType: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { groupType } = await params;
  const db = getServiceClient();

  const groupId = request.nextUrl.searchParams.get('group_id') || null;
  const cutoff = new Date(Date.now() - 5000).toISOString(); // 5 seconds ago

  let query = db
    .from('typing_status')
    .select('user_id, users!typing_status_user_id_fkey(name, avatar_url, room_number)')
    .eq('group_type', groupType)
    .neq('user_id', userId)
    .gt('last_typed_at', cutoff);

  if (groupId) {
    query = query.eq('group_id', groupId);
  } else {
    query = query.is('group_id', null);
  }

  const { data } = await query;

  const typingUsers = (data || []).map((row: Record<string, unknown>) => {
    const u = row.users as Record<string, unknown> | null;
    return { user_id: row.user_id, name: u?.name, avatar_url: u?.avatar_url, room_number: u?.room_number };
  });

  return json({ typing_users: typingUsers });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ groupType: string }> }) {
  // cleanup endpoint - /api/typing/cleanup
  const { groupType } = await params;
  if (groupType !== 'cleanup') return error('Not found', 404);

  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const cutoff = new Date(Date.now() - 30000).toISOString();
  await db.from('typing_status').delete().lt('last_typed_at', cutoff);

  return json({ success: true });
}
