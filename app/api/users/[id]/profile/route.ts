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

  // Fetch user's image attachments from main group messages only
  const { data: userMsgIds } = await db.from('messages').select('id')
    .eq('user_id', targetId).eq('group_id', 'main').or('is_deleted.is.null,is_deleted.eq.false');
  const idSet = new Set((userMsgIds || []).map((m: { id: number }) => m.id));

  const { data: attachmentRows } = idSet.size > 0
    ? await db.from('attachments').select('id, file_key, filename, created_at, message_id, content_type')
        .in('message_id', Array.from(idSet))
    : { data: [] };

  const media = (attachmentRows || [])
    .filter((a: { content_type: string }) => a.content_type?.startsWith('image/'))
    .sort((a: { created_at: string }, b: { created_at: string }) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
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
  const avatarUrl = body.avatar_url !== undefined ? (body.avatar_url || null) : undefined;

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (bio !== undefined) updates.bio = bio ?? null;
  if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

  const db = getServiceClient();
  await db.from('users').update(updates).eq('id', targetId);
  return json({ success: true });
}
