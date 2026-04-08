import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { id } = await params;
  const db = getServiceClient();

  const { data: evt } = await db.from('events')
    .select('*, users!events_creator_user_id_fkey(name, is_deleted, is_active)')
    .eq('id', parseInt(id)).single();
  if (!evt) return error('Event not found', 404);

  const { count } = await db.from('event_members').select('*', { count: 'exact', head: true }).eq('event_id', evt.id);
  const { data: membership } = await db.from('event_members').select('id').eq('event_id', evt.id).eq('user_id', userId).maybeSingle();
  const u = (evt as Record<string, unknown>).users as Record<string, unknown> | null;

  return json({
    ...evt, users: undefined,
    creator_name: u?.name, creator_is_deleted: u?.is_deleted, creator_is_active: u?.is_active,
    current_members: count || 0,
    is_joined: !!membership,
    is_creator: evt.creator_user_id === userId,
    is_expired: new Date() > new Date(evt.end_datetime),
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);
  const { id } = await params;
  const db = getServiceClient();

  const { data: evt } = await db.from('events').select('*').eq('id', parseInt(id)).single();
  if (!evt) return error('Event not found', 404);

  const { data: caller } = await db.from('users').select('is_admin').eq('id', userId).single();
  const isAdmin = caller?.is_admin === 1 || caller?.is_admin === true;
  if (evt.creator_user_id !== userId && !isAdmin) return error('Only the creator can delete this event', 403);

  // Archive to history
  const { count } = await db.from('event_members').select('*', { count: 'exact', head: true }).eq('event_id', parseInt(id));
  const { data: creatorUser } = await db.from('users').select('name, room_number').eq('id', evt.creator_user_id).single();
  const { data: members } = await db.from('event_members').select('user_id').eq('event_id', parseInt(id));

  const { data: histRecord } = await db.from('event_history').insert({
    event_id: parseInt(id), name: evt.name, description: evt.description, location: evt.location,
    start_datetime: evt.start_datetime, end_datetime: evt.end_datetime, max_members: evt.max_members,
    image_url: evt.image_url, creator_user_id: evt.creator_user_id,
    creator_name: (creatorUser as Record<string, unknown>)?.name, creator_room: (creatorUser as Record<string, unknown>)?.room_number,
    total_attendees: count || 0, is_deleted: true, ended_at: new Date().toISOString(),
  }).select().single();

  if (histRecord && members) {
    for (const m of members) {
      await db.from('event_history_attendees').insert({ event_history_id: (histRecord as { id: number }).id, user_id: (m as { user_id: string }).user_id });
    }
  }

  await db.from('event_members').delete().eq('event_id', parseInt(id));
  await db.from('events').delete().eq('id', parseInt(id));
  return json({ success: true });
}
