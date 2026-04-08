import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error, sanitizeHtml } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUserId = await authenticate();
  if (!currentUserId) return error('Unauthorized', 401);

  const { id: targetId } = await params;
  const db = getServiceClient();

  const { data: user } = await db
    .from('users')
    .select('id, name, avatar_url, room_number, bio, is_admin, is_active, is_deleted, created_at')
    .eq('id', targetId).single();
  if (!user) return error('User not found', 404);

  const [msgCount, eventsCreated, eventsAttended, requestsCreated] = await Promise.all([
    db.from('messages').select('*', { count: 'exact', head: true })
      .eq('user_id', targetId).or('is_deleted.is.null,is_deleted.eq.false'),
    db.from('events').select('*', { count: 'exact', head: true }).eq('creator_user_id', targetId),
    db.from('event_members').select('*', { count: 'exact', head: true }).eq('user_id', targetId),
    db.from('market_listings').select('*', { count: 'exact', head: true }).eq('creator_user_id', targetId),
  ]);

  const { data: helperRows } = await db.from('market_listing_history')
    .select('helper_user_ids').like('helper_user_ids', `%"${targetId}"%`);
  const helpedOthers = helperRows?.length || 0;

  const { data: attachmentRows } = await db
    .from('attachments')
    .select('id, file_key, filename, created_at, message_id')
    .eq('content_type', 'image/%');

  // Filter by user's messages
  const { data: userMsgIds } = await db.from('messages').select('id').eq('user_id', targetId);
  const idSet = new Set((userMsgIds || []).map((m: { id: number }) => m.id));
  const media = (attachmentRows || [])
    .filter((a: { message_id: number }) => idSet.has(a.message_id))
    .slice(0, 30)
    .map((a: { id: number; file_key: string; filename: string; created_at: string }) => ({
      id: a.id,
      url: `/api/files/${a.file_key}`,
      fileKey: a.file_key,
      filename: a.filename,
      created_at: a.created_at,
    }));

  return json({
    user: {
      id: user.id, name: user.name, avatar_url: user.avatar_url, room_number: user.room_number,
      bio: user.bio, is_admin: user.is_admin === true || user.is_admin === 1,
      is_active: user.is_active === true || user.is_active === 1,
      is_deleted: user.is_deleted === true || user.is_deleted === 1,
      created_at: user.created_at,
    },
    stats: {
      messagesSent: msgCount.count || 0,
      eventsCreated: eventsCreated.count || 0,
      eventsAttended: eventsAttended.count || 0,
      requestsCreated: requestsCreated.count || 0,
      helpedOthers,
    },
    media,
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const currentUserId = await authenticate();
  if (!currentUserId) return error('Unauthorized', 401);

  const { id: targetId } = await params;
  if (currentUserId !== targetId) return error('You can only edit your own profile', 403);

  const body = await request.json().catch(() => ({}));
  const bio = body.bio !== undefined ? sanitizeHtml((body.bio || '').trim()).slice(0, 500) : undefined;

  const db = getServiceClient();
  await db.from('users').update({ bio: bio ?? null, updated_at: new Date().toISOString() }).eq('id', targetId);
  return json({ success: true });
}
