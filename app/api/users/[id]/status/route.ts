import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const db = getServiceClient();
  const { data: caller } = await db.from('users').select('is_admin').eq('id', userId).single();
  if (!caller || !(caller.is_admin === 1 || caller.is_admin === true)) return error('Only admins can do this', 403);

  const { id: targetId } = await params;
  if (targetId === userId) return error('You cannot deactivate your own account', 400);

  const body = await request.json().catch(() => ({}));
  const isActive = body.is_active ? 1 : 0;

  const { data: targetUser } = await db.from('users').select('email, name, room_number, avatar_url').eq('id', targetId).single();

  if (!isActive) {
    // Delete active events by this user
    const { data: userEvents } = await db.from('events').select('id, name').eq('creator_user_id', targetId);
    for (const evt of (userEvents || [])) {
      await db.from('event_members').delete().eq('event_id', evt.id);
      await db.from('events').delete().eq('id', evt.id);
      await db.from('system_messages').insert({
        type: 'event_deleted', user_id: targetId,
        message: `Event "${evt.name}" was removed because the creator was deactivated`,
        metadata: JSON.stringify({ message_type: 'event_deleted_by_deactivation', event_title: evt.name }),
      });
    }
    await db.from('users').update({ is_active: 0, updated_at: new Date().toISOString() }).eq('id', targetId);
    if (targetUser) {
      await db.from('system_messages').insert({
        type: 'user_deactivated', user_id: targetId,
        message: `${targetUser.name || 'User'} was blocked`,
        metadata: JSON.stringify({ message_type: 'user_deactivated', name: targetUser.name, room_number: targetUser.room_number, avatar_url: targetUser.avatar_url }),
      });
    }
  } else {
    await db.from('users').update({ is_active: 1, updated_at: new Date().toISOString() }).eq('id', targetId);
    if (targetUser) {
      await db.from('system_messages').insert({
        type: 'user_reactivated', user_id: targetId,
        message: `${targetUser.name || 'User'} was reactivated`,
        metadata: JSON.stringify({ message_type: 'user_reactivated', name: targetUser.name }),
      });
    }
  }

  const { data: updatedUser } = await db.from('users').select('*').eq('id', targetId).single();
  return json(updatedUser);
}
