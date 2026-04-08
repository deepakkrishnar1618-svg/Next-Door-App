import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const db = getServiceClient();

  const { data: caller } = await db.from('users').select('is_admin').eq('id', userId).single();
  if (!caller || (caller.is_admin !== 1 && caller.is_admin !== true)) return error('Only admins can export comprehensive data', 403);

  const [
    { data: users },
    { data: messages },
    { data: attachments },
    { data: eventHistory },
    { data: listingHistory },
    { data: transactions },
  ] = await Promise.all([
    db.from('users').select('id, name, room_number, email, avatar_url, bio, created_at, is_admin, is_online, is_active, is_deleted').eq('profile_completed', true).order('name', { ascending: true }),
    db.from('messages').select('id, user_id, content, created_at, is_edited, is_deleted, users!messages_user_id_fkey(name, room_number)').eq('is_deleted', false).order('created_at', { ascending: true }),
    db.from('attachments').select('id, message_id, filename, file_key, file_size, content_type, created_at').order('created_at', { ascending: true }),
    db.from('event_history').select('*').order('start_datetime', { ascending: false }),
    db.from('market_listing_history').select('*').order('ended_at', { ascending: false }),
    db.from('market_transactions').select('*').order('closed_at', { ascending: false }),
  ]);

  return json({
    exportedAt: new Date().toISOString(),
    users: users || [],
    messages: (messages || []).map((m: Record<string, unknown>) => ({
      ...m, users: undefined,
      user_name: (m.users as Record<string, unknown> | null)?.name,
      user_room: (m.users as Record<string, unknown> | null)?.room_number,
    })),
    attachments: attachments || [],
    eventHistory: eventHistory || [],
    listingHistory: listingHistory || [],
    transactions: transactions || [],
  });
}
