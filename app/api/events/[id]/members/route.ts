import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { id } = await params;
  const db = getServiceClient();
  const eventId = parseInt(id);

  const { data: caller } = await db.from('users').select('is_active').eq('id', userId).single();
  if (!caller || caller.is_active === 0 || caller.is_active === false) return error('Your account has been deactivated', 403);

  const { data: rawMembers } = await db
      .from('event_members')
      .select(`
        user_id, created_at,
        users!event_members_user_id_fkey(name, avatar_url, room_number, is_online, last_seen_at, is_deleted, is_active),
        events!event_members_event_id_fkey(creator_user_id)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    const now = new Date();
    const enriched = (rawMembers || []).map((m: Record<string, unknown>) => {
      const u = m.users as Record<string, unknown> | null;
      const e = m.events as Record<string, unknown> | null;
      const lastSeen = u?.last_seen_at ? new Date(u.last_seen_at as string) : null;
      const isOnlineNow = u?.is_online && lastSeen && (now.getTime() - lastSeen.getTime()) < 2 * 60 * 1000;
      return {
        user_id: m.user_id,
        joined_at: m.created_at,
        name: u?.name,
        avatar_url: u?.avatar_url,
        room_number: u?.room_number,
        is_online: isOnlineNow ? 1 : 0,
        last_seen_at: u?.last_seen_at,
        is_creator: e?.creator_user_id === m.user_id ? 1 : 0,
        is_deleted: u?.is_deleted,
        is_active: u?.is_active,
      };
    });

    // Sort: deleted/inactive last, creator first, then by join time
    enriched.sort((a, b) => {
      const aInactive = (a.is_deleted || !a.is_active) ? 1 : 0;
      const bInactive = (b.is_deleted || !b.is_active) ? 1 : 0;
      if (aInactive !== bInactive) return aInactive - bInactive;
      if (a.is_creator !== b.is_creator) return (b.is_creator as number) - (a.is_creator as number);
      return 0;
    });

  return json({ members: enriched });
}
