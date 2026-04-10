import { NextRequest } from 'next/server';
import { authenticate, getServiceClient, json, error } from '@/src/lib/api-helpers';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await authenticate();
  if (!userId) return error('Unauthorized', 401);

  const db = getServiceClient();
  const { data: caller } = await db.from('users').select('is_admin').eq('id', userId).single();
  if (!caller || !(caller.is_admin === 1 || caller.is_admin === true)) return error('Only admins can delete users', 403);

  const { id: targetId } = await params;
  if (targetId === userId) return error('You cannot delete your own account', 400);

  const { data: targetUser } = await db.from('users').select('name, room_number').eq('id', targetId).single();

  // Clean up user associations (but keep messages — anonymized below)
  await db.from('reactions').delete().eq('user_id', targetId);
  await db.from('notifications').delete().or(`user_id.eq.${targetId},mentioned_by_user_id.eq.${targetId}`);
  await db.from('message_reads').delete().eq('user_id', targetId);
  await db.from('system_messages').delete().eq('user_id', targetId);
  await db.from('event_message_reads').delete().eq('user_id', targetId);
  await db.from('event_message_reactions').delete().eq('user_id', targetId);
  await db.from('email_notification_users').delete().eq('user_id', targetId);
  await db.from('event_members').delete().eq('user_id', targetId);

  // Delete active events created by this user
  const { data: userEvents } = await db.from('events').select('id').eq('creator_user_id', targetId);
  for (const evt of (userEvents || [])) {
    await db.from('event_members').delete().eq('event_id', evt.id);
    await db.from('events').delete().eq('id', evt.id);
  }

  // Anonymize the user record — keep the row (and user_id FK in messages) intact
  await db.from('users').update({
    name: 'Deleted User',
    email: `deleted_${targetId}@deleted.com`,
    avatar_url: null,
    room_number: null,
    is_deleted: true,
    is_active: 0,
    updated_at: new Date().toISOString(),
  }).eq('id', targetId);

  // Remove user from Supabase Auth
  await db.auth.admin.deleteUser(targetId);

  if (targetUser) {
    await db.from('system_messages').insert({
      type: 'user_deleted', user_id: targetId,
      message: `${targetUser.name || 'User'} was deleted`,
      metadata: JSON.stringify({ message_type: 'user_deleted', name: targetUser.name, room_number: targetUser.room_number }),
    });
  }

  return json({ success: true });
}
